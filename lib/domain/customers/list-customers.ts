import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { moneyString, ZERO } from "./internal";
import type { CustomerListRow, ListCustomersFilter } from "./types";

/**
 * List customers with a **derived** running balance per row (ADR-17/19).
 *
 * The balance is computed **set-wise**, never in a per-customer loop: one
 * grouped `SUM(Debt.amount)` by `customerId`, one grouped
 * `SUM(Repayment.amount)` by `customerId`, combined as
 * `balance = Σ debts − Σ repayments`. Same for `lastActivityAt` — the max
 * `occurredAt` across both tables, grouped.
 *
 * `search` matches name OR phone, case-insensitive contains.
 * `hasBalance` keeps only rows whose derived balance ≠ 0 (either
 * direction — including overpaid/credit-in-hand customers, whose balance
 * is negative).
 * `owingOnly` keeps only rows whose derived balance is **strictly
 * positive** (the customer owes the business) — for the Financials v2
 * "Debts owed to the business" card, which is a table of who owes money,
 * not the full credit register `hasBalance` serves. `owingOnly` implies
 * `hasBalance`'s effect and the two are not meant to be combined.
 *
 * `oldestDebtAt` (present only when the row has at least one `Debt`) is
 * the earliest `Debt.occurredAt` for that customer — labelled "oldest
 * unpaid" on the v2 card. **This is a simplification, not a true
 * oldest-unpaid-debt figure**: `Debt` and `Repayment` carry no FIFO
 * linkage (a repayment reduces the customer's total balance, not a
 * specific debt row), so which individual debt(s) remain "unpaid" when a
 * customer has partial repayments against several debts is not a
 * question this schema can answer today. The dashboard-v2 handoff
 * (M5 "Dashboard & Financials v2" Session A) flagged this ambiguity to
 * the owner rather than inventing an allocation rule — see
 * `docs/PROGRESS.md`'s session entry for the open question. Until
 * resolved, `oldestDebtAt` is a reasonable proxy for a card whose real
 * job is "who has owed us money the longest", not a per-debt aging report.
 */
export async function listCustomers(
  filter: ListCustomersFilter,
  // ctx reserved for future role scoping; nothing customer-side is
  // per-cashier (a Cashier sees the full list — plan §7).
): Promise<CustomerListRow[]> {
  const search = filter.search?.trim();
  const where: Prisma.CustomerWhereInput =
    search && search.length > 0
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
  });
  if (customers.length === 0) return [];

  const ids = customers.map((c) => c.id);

  const [debtSums, repaySums, debtLast, repayLast, debtOldest] =
    await Promise.all([
      prisma.debt.groupBy({
        by: ["customerId"],
        where: { customerId: { in: ids } },
        _sum: { amount: true },
      }),
      prisma.repayment.groupBy({
        by: ["customerId"],
        where: { customerId: { in: ids } },
        _sum: { amount: true },
      }),
      prisma.debt.groupBy({
        by: ["customerId"],
        where: { customerId: { in: ids } },
        _max: { occurredAt: true },
      }),
      prisma.repayment.groupBy({
        by: ["customerId"],
        where: { customerId: { in: ids } },
        _max: { occurredAt: true },
      }),
      prisma.debt.groupBy({
        by: ["customerId"],
        where: { customerId: { in: ids } },
        _min: { occurredAt: true },
      }),
    ]);

  const debtByCustomer = new Map(
    debtSums.map((g) => [g.customerId, g._sum.amount ?? ZERO]),
  );
  const repayByCustomer = new Map(
    repaySums.map((g) => [g.customerId, g._sum.amount ?? ZERO]),
  );
  const lastByCustomer = new Map<string, Date>();
  for (const g of [...debtLast, ...repayLast]) {
    const at = g._max.occurredAt;
    if (!at) continue;
    const prev = lastByCustomer.get(g.customerId);
    if (!prev || at > prev) lastByCustomer.set(g.customerId, at);
  }
  const oldestDebtByCustomer = new Map(
    debtOldest
      .filter((g) => g._min.occurredAt != null)
      .map((g) => [g.customerId, g._min.occurredAt as Date]),
  );

  let rows = customers.map((c) => {
    const balance = (debtByCustomer.get(c.id) ?? ZERO).minus(
      repayByCustomer.get(c.id) ?? ZERO,
    );
    const last = lastByCustomer.get(c.id);
    const oldestDebtAt = oldestDebtByCustomer.get(c.id);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: moneyString(balance),
      lastActivityAt: last ? last.toISOString() : null,
      oldestDebtAt: oldestDebtAt ? oldestDebtAt.toISOString() : null,
      _balanceDec: balance,
    };
  });

  if (filter.owingOnly) {
    rows = rows
      .filter((r) => r._balanceDec.gt(ZERO))
      // Oldest-unpaid first — the Financials v2 Debts card reads as "who
      // has owed us money the longest", not a paginated customer list
      // (that stays name-sorted, the base `listCustomers` order above).
      // A row with no `oldestDebtAt` cannot happen here (a positive
      // balance implies at least one Debt row), but sorts last if it did.
      .sort((a, b) => {
        if (!a.oldestDebtAt && !b.oldestDebtAt) return 0;
        if (!a.oldestDebtAt) return 1;
        if (!b.oldestDebtAt) return -1;
        return a.oldestDebtAt.localeCompare(b.oldestDebtAt);
      });
  } else if (filter.hasBalance) {
    rows = rows.filter((r) => !r._balanceDec.isZero());
  }

  return rows.map(({ _balanceDec, ...rest }) => rest);
}
