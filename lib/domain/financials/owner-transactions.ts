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

function toOwnerTransactionView(
  row: {
    id: string;
    type: OwnerTransactionView["type"];
    amount: Prisma.Decimal;
    date: Date;
    note: string | null;
  },
  derived?: { type: OwnerTransactionView["type"]; amount: Prisma.Decimal; corrected: boolean },
): OwnerTransactionView {
  return {
    id: row.id,
    type: derived ? derived.type : row.type,
    amount: moneyString(derived ? derived.amount : row.amount),
    date: row.date.toISOString(),
    note: row.note,
    occurredAt: row.date.toISOString(),
    ...(derived ? { corrected: derived.corrected } : {}),
  };
}

/**
 * Signed cash effect of an owner-transaction row: `draw` → negative
 * (money out of `cash`), `return` → positive. A correction row stores its
 * delta the same way; folding = summing these, then splitting back.
 */
function signedAmount(
  type: OwnerTransactionView["type"],
  amount: Prisma.Decimal,
): Prisma.Decimal {
  return type === "draw" ? amount.negated() : amount;
}

function splitSigned(signed: Prisma.Decimal): {
  type: OwnerTransactionView["type"];
  amount: Prisma.Decimal;
} {
  return signed.isNegative()
    ? { type: "draw", amount: signed.negated() }
    : { type: "return", amount: signed };
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
  const where: Prisma.OwnerTransactionWhereInput = {
    // Correction rows (ADR-72) never appear on their own — their signed
    // deltas are folded into each original's derived type / amount below.
    correctsOwnerTransactionId: null,
  };
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

  const ids = rows.map((r) => r.id);
  const deltaSignedById = new Map<string, Prisma.Decimal>();
  if (ids.length > 0) {
    const corrections = await prisma.ownerTransaction.findMany({
      where: { correctsOwnerTransactionId: { in: ids } },
      select: { correctsOwnerTransactionId: true, type: true, amount: true },
    });
    for (const c of corrections) {
      const oid = c.correctsOwnerTransactionId as string;
      const prev = deltaSignedById.get(oid) ?? new Prisma.Decimal(0);
      deltaSignedById.set(oid, prev.add(signedAmount(c.type, c.amount)));
    }
  }

  return rows.map((r) => {
    const delta = deltaSignedById.get(r.id);
    if (!delta) return toOwnerTransactionView(r);
    const derivedSigned = signedAmount(r.type, r.amount).add(delta);
    const split = splitSigned(derivedSigned);
    return toOwnerTransactionView(r, { ...split, corrected: true });
  });
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
  const range = {
    gte: businessDateStartUtc(from),
    lt: businessDateEndUtc(to),
  };

  // Originals dated in range (correction rows share their original's date;
  // fold their signed deltas in, then keep only the net draw magnitude).
  const originals = await prisma.ownerTransaction.findMany({
    where: { correctsOwnerTransactionId: null, date: range },
    select: { id: true, type: true, amount: true },
  });
  if (originals.length === 0) return new Prisma.Decimal(0);

  const deltaSignedById = new Map<string, Prisma.Decimal>();
  const corrections = await prisma.ownerTransaction.findMany({
    where: { correctsOwnerTransactionId: { in: originals.map((o) => o.id) } },
    select: { correctsOwnerTransactionId: true, type: true, amount: true },
  });
  for (const c of corrections) {
    const oid = c.correctsOwnerTransactionId as string;
    const prev = deltaSignedById.get(oid) ?? new Prisma.Decimal(0);
    deltaSignedById.set(oid, prev.add(signedAmount(c.type, c.amount)));
  }

  return originals.reduce((acc, o) => {
    const derivedSigned = signedAmount(o.type, o.amount).add(
      deltaSignedById.get(o.id) ?? new Prisma.Decimal(0),
    );
    // Net draw only (money out) — a net return contributes nothing, like
    // the pre-correction `type = "draw"` filter.
    return derivedSigned.isNegative() ? acc.add(derivedSigned.negated()) : acc;
  }, new Prisma.Decimal(0));
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
