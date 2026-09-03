import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import { recordMoneyMovement } from "./record-money-movement";
import { DomainError } from "./errors";
import { moneyString, toPositiveAmount } from "./internal";
import type {
  CorrectExpenseInput,
  ExpenseView,
  FinancialsActor,
  ListExpensesFilter,
  RecordExpenseInput,
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

/**
 * The UTC instant an `Expense` / `OwnerTransaction` dated to `businessDate`
 * is stored at — noon of that Africa/Nairobi day. Any instant strictly
 * inside `[start, end)` buckets to the same business date; noon is furthest
 * from both edges, so it survives display formatting in any timezone.
 */
export function businessDateNoonUtc(businessDate: string): Date {
  return new Date(`${businessDate}T12:00:00+03:00`);
}

function toExpenseView(
  row: {
    id: string;
    category: ExpenseView["category"];
    amount: Prisma.Decimal;
    date: Date;
    paidFromAccount: ExpenseView["paidFromAccount"];
    note: string | null;
    recordedById: string;
  },
  derivedAmount: Prisma.Decimal,
  corrected: boolean,
): ExpenseView {
  return {
    id: row.id,
    category: row.category,
    amount: moneyString(derivedAmount),
    date: row.date.toISOString(),
    paidFromAccount: row.paidFromAccount,
    note: row.note,
    recordedById: row.recordedById,
    corrected,
    occurredAt: row.date.toISOString(),
  };
}

/**
 * Record a business expense (PRD §4.7). **Admin-only** — enforced at the
 * route. In one transaction:
 *   1. create the `Expense` row (dated to a business day),
 *   2. append a **negative** `MoneyMovement` (`sourceType: "expense"`,
 *      `sourceId` = the expense id) debiting `paidFromAccount` by `amount`,
 *      via `recordMoneyMovement` (which writes its own `AuditLog` row),
 *   3. write an `AuditLog` row for the expense itself.
 *
 * This mirrors `recordPurchasePayment`: the expense row is the record, the
 * paired money row is what moves the derived account balance, so
 * `getAccountBalances` stays a plain `SUM(amount)` with no per-source
 * logic.
 *
 * **Day-close gated** (ADR-52) — a fresh expense on a sealed day is
 * rejected for everyone; the Admin's route back in is `correctExpense`.
 * The Admin is exempt from the staff "today only" rule (ADR-53), so they
 * may log a past-dated expense on an open day.
 *
 * Pass `ctx.tx` to run inside an already-open transaction — `payStaff`
 * (M4 S9A) writes the Salaries `Expense` and the `StaffPayout` row that
 * links to it in one transaction so cash, profit and the payout record
 * commit together or not at all. With no `tx` this opens its own.
 */
export async function recordExpense(
  input: RecordExpenseInput,
  actor: FinancialsActor,
  ctx: { tx?: Prisma.TransactionClient } = {},
): Promise<ExpenseView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can record an expense.",
    );
  }
  const amount = toPositiveAmount(input.amount, "amount");
  assertBusinessDate(input.date);
  const occurredAt = businessDateNoonUtc(input.date);
  const note = input.note?.trim() ? input.note.trim() : null;

  const write = async (tx: Prisma.TransactionClient) => {
    await assertDayOpen(input.date, tx);

    const expense = await tx.expense.create({
      data: {
        category: input.category,
        amount,
        date: occurredAt,
        paidFromAccount: input.paidFromAccount,
        note,
        recordedById: actor.actorId,
      },
    });

    await recordMoneyMovement(
      {
        account: input.paidFromAccount,
        amount: amount.negated(), // money out
        sourceType: "expense",
        sourceId: expense.id,
        occurredAt,
        note: note ?? undefined,
      },
      { actorId: actor.actorId, tx },
    );

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "create",
        entityType: "expense",
        entityId: expense.id,
        newValue: {
          category: expense.category,
          amount: amount.toFixed(2),
          paidFromAccount: expense.paidFromAccount,
        },
        occurredAt,
      },
    });

    return expense;
  };

  const row = ctx.tx ? await write(ctx.tx) : await prisma.$transaction(write);

  return toExpenseView(row, row.amount, false);
}

/**
 * Correct an expense's amount (ADR-15 / CONVENTIONS §4, shaped after
 * `stock/correct-movement.ts`).
 *
 *   1. loads the original `Expense` (never mutated);
 *   2. computes `delta = correctedAmount − currentDerivedAmount`, where
 *      the current derived amount is `original + Σ every existing
 *      correction delta`. Re-submitting the same corrected amount is
 *      `delta 0` and is rejected — never stacks a second identical delta
 *      (M1 F-1 / Session 17 F-1);
 *   3. writes **one new `Expense`** (`correctsExpenseId = original.id`,
 *      `amount` = the signed delta, same `category` / `date` /
 *      `paidFromAccount`, `note` carried or replaced), plus a paired
 *      delta `MoneyMovement` so the account balance tracks the correction.
 *
 * The target must be an **original** row — a correction row
 * (`correctsExpenseId` set) cannot itself be corrected. Admin-only. **Not**
 * day-close gated.
 */
export async function correctExpense(
  input: CorrectExpenseInput,
  actor: FinancialsActor,
): Promise<ExpenseView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct an expense.",
    );
  }
  const corrected = toPositiveAmount(input.amount, "amount");

  const originalId = await prisma.$transaction(async (tx) => {
    const original = await tx.expense.findUnique({
      where: { id: input.expenseId },
    });
    if (!original) {
      throw new DomainError("NOT_FOUND", "Expense not found.", "expenseId");
    }
    if (original.correctsExpenseId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This row is itself a correction. Correct the original expense instead.",
        "expenseId",
      );
    }

    const priorDeltas = await tx.expense.aggregate({
      _sum: { amount: true },
      where: { correctsExpenseId: original.id },
    });
    const currentValue = original.amount.add(priorDeltas._sum.amount ?? 0);
    const delta = corrected.sub(currentValue);
    if (delta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected amount is the same as the current one.",
        "amount",
      );
    }

    const note =
      input.note !== undefined
        ? input.note.trim()
          ? input.note.trim()
          : null
        : original.note;

    const correction = await tx.expense.create({
      data: {
        category: original.category,
        amount: delta,
        date: original.date,
        paidFromAccount: original.paidFromAccount,
        note,
        recordedById: actor.actorId,
        correctsExpenseId: original.id,
      },
    });

    // Paired money delta — negative delta means the expense grew (more
    // money out), positive means it shrank (money comes back).
    await recordMoneyMovement(
      {
        account: original.paidFromAccount,
        amount: delta.negated(),
        sourceType: "expense",
        sourceId: correction.id,
        occurredAt: original.date,
        note: note ?? undefined,
      },
      { actorId: actor.actorId, tx },
    );

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "expense",
        entityId: original.id,
        newValue: {
          correctionId: correction.id,
          amountTo: corrected.toFixed(2),
          amountDelta: delta.toFixed(2),
        },
        occurredAt: original.date,
      },
    });

    return original.id;
  });

  const original = await prisma.expense.findUniqueOrThrow({
    where: { id: originalId },
  });
  const deltas = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { correctsExpenseId: originalId },
  });
  const derived = original.amount.add(deltas._sum.amount ?? 0);
  return toExpenseView(original, derived, deltas._sum.amount != null);
}

/**
 * List expenses for the Admin financials view, corrections folded into
 * each row's `amount` (correction rows are never returned on their own).
 * Filterable by inclusive business-date range and category. Newest first.
 * Admin-only — enforced at the route.
 */
export async function listExpenses(
  filter: ListExpensesFilter = {},
): Promise<ExpenseView[]> {
  const where: Prisma.ExpenseWhereInput = { correctsExpenseId: null };
  if (filter.category) where.category = filter.category;
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

  const rows = await prisma.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const ids = rows.map((r) => r.id);
  const deltaById = new Map<string, Prisma.Decimal>();
  if (ids.length > 0) {
    const deltas = await prisma.expense.groupBy({
      by: ["correctsExpenseId"],
      where: { correctsExpenseId: { in: ids } },
      _sum: { amount: true },
    });
    for (const d of deltas) {
      deltaById.set(
        d.correctsExpenseId as string,
        d._sum.amount ?? new Prisma.Decimal(0),
      );
    }
  }

  return rows.map((r) => {
    const delta = deltaById.get(r.id);
    return toExpenseView(
      r,
      delta ? r.amount.add(delta) : r.amount,
      delta !== undefined,
    );
  });
}
