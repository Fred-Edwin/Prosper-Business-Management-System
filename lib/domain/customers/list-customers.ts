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
 * `hasBalance` keeps only rows whose derived balance ≠ 0.
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

  const [debtSums, repaySums, debtLast, repayLast] = await Promise.all([
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

  let rows = customers.map((c) => {
    const balance = (debtByCustomer.get(c.id) ?? ZERO).minus(
      repayByCustomer.get(c.id) ?? ZERO,
    );
    const last = lastByCustomer.get(c.id);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: moneyString(balance),
      lastActivityAt: last ? last.toISOString() : null,
      _balanceDec: balance,
    };
  });

  if (filter.hasBalance) {
    rows = rows.filter((r) => !r._balanceDec.isZero());
  }

  return rows.map(({ _balanceDec, ...rest }) => rest);
}
