import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import { recordMoneyMovement } from "./record-money-movement";
import { businessDateNoonUtc } from "./expenses";
import { DomainError } from "./errors";
import { moneyString, toPositiveAmount } from "./internal";
import type {
  FinancialsActor,
  ListOwnerTransactionsFilter,
  OwnerTransactionView,
  RecordOwnerTransactionInput,
} from "./types";

const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertBusinessDate(date: string, field = "date"): void {
  if (!BUSINESS_DATE_RE.test(date)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Date must be a YYYY-MM-DD business date.",
      field,
    );
  }
}

function toOwnerTransactionView(row: {
  id: string;
  type: OwnerTransactionView["type"];
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
}): OwnerTransactionView {
  return {
    id: row.id,
    type: row.type,
    amount: moneyString(row.amount),
    date: row.date.toISOString(),
    note: row.note,
    occurredAt: row.date.toISOString(),
  };
}

/**
 * Record an owner draw or return (PRD §4.7). **Admin-only** — enforced at
 * the route.
 *
 *   - `draw`   → money OUT of Cash at hand: a **negative** `MoneyMovement`
 *     on `cash`, `sourceType: "owner_draw"`.
 *   - `return` → money IN: a **positive** `MoneyMovement` on `cash`,
 *     `sourceType: "owner_return"`.
 *
 * The "owed to business" figure (draws − returns) is **never stored** — it
 * is derived on read by `getOwnerOwedToBusiness` summing the
 * `OwnerTransaction` rows (CLAUDE.md non-negotiable: ledgers, not stored
 * totals).
 *
 * **Day-close gated** (ADR-52) — a create path. `OwnerTransaction` has no
 * correction self-relation; a mistaken draw is undone by recording the
 * opposite transaction, which nets out in every sum.
 */
export async function recordOwnerTransaction(
  input: RecordOwnerTransactionInput,
  actor: FinancialsActor,
): Promise<OwnerTransactionView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can record an owner transaction.",
    );
  }
  if (input.type !== "draw" && input.type !== "return") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Type must be draw or return.",
      "type",
    );
  }
  const amount = toPositiveAmount(input.amount, "amount");
  assertBusinessDate(input.date);
  const occurredAt = businessDateNoonUtc(input.date);
  const note = input.note?.trim() ? input.note.trim() : null;

  const row = await prisma.$transaction(async (tx) => {
    await assertDayOpen(input.date, tx);

    const txn = await tx.ownerTransaction.create({
      data: { type: input.type, amount, date: occurredAt, note },
    });

    await recordMoneyMovement(
      {
        account: "cash",
        amount: input.type === "draw" ? amount.negated() : amount,
        sourceType: input.type === "draw" ? "owner_draw" : "owner_return",
        sourceId: txn.id,
        occurredAt,
        note: note ?? undefined,
      },
      { actorId: actor.actorId, tx },
    );

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "create",
        entityType: "owner_transaction",
        entityId: txn.id,
        newValue: { type: txn.type, amount: amount.toFixed(2) },
        occurredAt,
      },
    });

    return txn;
  });

  return toOwnerTransactionView(row);
}

/**
 * List owner transactions for the Admin financials view. Filterable by
 * inclusive business-date range. Newest first. Admin-only — enforced at
 * the route.
 */
export async function listOwnerTransactions(
  filter: ListOwnerTransactionsFilter = {},
): Promise<OwnerTransactionView[]> {
  const where: Prisma.OwnerTransactionWhereInput = {};
  if (filter.from || filter.to) {
    where.date = {};
    if (filter.from) {
      assertBusinessDate(filter.from, "from");
      where.date.gte = businessDateStartUtc(filter.from);
    }
    if (filter.to) {
      assertBusinessDate(filter.to, "to");
      where.date.lt = businessDateEndUtc(filter.to);
    }
  }

  const rows = await prisma.ownerTransaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toOwnerTransactionView);
}

/**
 * `Σ draws` (`type = "draw"` only — NOT netted against returns) over an
 * inclusive `[from, to]` business-date range. A FLOW (ADR-57), distinct
 * from `getOwnerOwedToBusiness` (a running BALANCE, draws − returns, no
 * date filter). Folded into `getFinancialSummary().consolidated` for
 * Dashboard v2's "Owner draws this <period>" row.
 */
export async function getOwnerDrawsForPeriod(
  from: string,
  to: string,
): Promise<Prisma.Decimal> {
  assertBusinessDate(from, "from");
  assertBusinessDate(to, "to");
  const agg = await prisma.ownerTransaction.aggregate({
    _sum: { amount: true },
    where: {
      type: "draw",
      date: {
        gte: businessDateStartUtc(from),
        lt: businessDateEndUtc(to),
      },
    },
  });
  return agg._sum.amount ?? new Prisma.Decimal(0);
}

/**
 * The derived "owed to the business by the owner" figure: `Σ draws −
 * Σ returns` over **every** `OwnerTransaction` row (no date filter — it is
 * a running balance, not a period figure). Positive = the owner owes the
 * business; negative = the business owes the owner. `Prisma.Decimal`.
 */
export async function getOwnerOwedToBusiness(
  asOf?: Date,
): Promise<Prisma.Decimal> {
  const where = asOf != null ? { date: { lte: asOf } } : undefined;
  const grouped = await prisma.ownerTransaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
    where,
  });
  const byType = new Map(
    grouped.map((g) => [g.type, g._sum.amount ?? new Prisma.Decimal(0)]),
  );
  const draws = byType.get("draw") ?? new Prisma.Decimal(0);
  const returns = byType.get("return") ?? new Prisma.Decimal(0);
  return draws.sub(returns);
}
