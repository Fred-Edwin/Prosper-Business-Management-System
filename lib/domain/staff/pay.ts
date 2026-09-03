import { Prisma, type MoneyAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
import { recordExpense } from "@/lib/domain/financials";
import {
  businessDateOnly,
  businessMonthRange,
  nairobiToday,
  toBusinessDate,
} from "@/lib/time";
import { DomainError } from "./errors";
import type { StaffActor } from "./types";

const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const RATE_RE = /^\d+(\.\d{1,2})?$/;

const ZERO = new Prisma.Decimal(0);

function assertMonth(month: string): void {
  if (!MONTH_RE.test(month)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Month must be YYYY-MM.",
      "month",
    );
  }
}

/** Count business dates (calendar days) in an inclusive YYYY-MM-DD range. */
function daysInRange(from: string, to: string): number {
  const a = Date.UTC(
    +from.slice(0, 4),
    +from.slice(5, 7) - 1,
    +from.slice(8, 10),
  );
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** The 1st of a `YYYY-MM` month as a `@db.Date` value (payout `month` key). */
function monthStartDate(month: string): Date {
  return businessDateOnly(`${month}-01`);
}

type PayoutRow = {
  id: string;
  staffId: string;
  month: Date;
  netPaid: Prisma.Decimal;
  date: Date;
  paidFromAccount: MoneyAccount;
  expenseId: string;
};

function toPayoutView(row: PayoutRow): StaffPayoutView {
  return {
    id: row.id,
    staffId: row.staffId,
    month: toBusinessDate(row.month).slice(0, 7),
    netPaid: row.netPaid.toFixed(2),
    date: toBusinessDate(row.date),
    paidFromAccount: row.paidFromAccount,
    expenseId: row.expenseId,
  };
}

export type PayAdjustmentType = "advance" | "deduction";

export type PayAdjustmentView = {
  id: string;
  staffId: string;
  type: PayAdjustmentType;
  amount: string;
  date: string;
  note: string | null;
};

export type RecordPayAdjustmentInput = {
  staffId: string;
  type: PayAdjustmentType;
  /** Decimal string, > 0. */
  amount: string;
  /** YYYY-MM-DD business date. */
  date: string;
  note?: string;
};

/**
 * Record a salary advance or deduction against a staff member (PRD §4.8).
 * **Admin-only.**
 *
 * This IS an append-only create path (`StaffPayAdjustment` has no
 * correction self-relation and no mutable total), so per the S8A brief it
 * is **day-close gated** — `assertDayOpen(date)`. A mistaken adjustment on
 * a closed day is undone by recording the opposite type for the same
 * amount, which nets out in `getStaffPay`.
 *
 * `amount` is stored as a positive magnitude; the sign is implied by
 * `type` and applied at read time (both advances and deductions are
 * *subtracted* from gross pay — PRD §4.8 "netted off monthly pay").
 */
export async function recordPayAdjustment(
  input: RecordPayAdjustmentInput,
  actor: StaffActor,
): Promise<PayAdjustmentView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can record a pay adjustment.",
    );
  }
  if (input.type !== "advance" && input.type !== "deduction") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Type must be advance or deduction.",
      "type",
    );
  }
  if (!BUSINESS_DATE_RE.test(input.date)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Date must be a YYYY-MM-DD business date.",
      "date",
    );
  }
  const trimmedAmount = input.amount.trim();
  if (!RATE_RE.test(trimmedAmount)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be a number with up to 2 decimal places.",
      "amount",
    );
  }
  const amount = new Prisma.Decimal(trimmedAmount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be greater than zero.",
      "amount",
    );
  }
  const note = input.note?.trim() ? input.note.trim() : null;

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { id: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }

  const dateOnly = businessDateOnly(input.date);

  const row = await prisma.$transaction(async (tx) => {
    await assertDayOpen(input.date, tx);
    const created = await tx.staffPayAdjustment.create({
      data: {
        staffId: input.staffId,
        type: input.type,
        amount,
        date: dateOnly,
        note,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "create",
        entityType: "staff_pay_adjustment",
        entityId: created.id,
        newValue: { type: created.type, amount: amount.toFixed(2) },
        occurredAt: dateOnly,
      },
    });
    return created;
  });

  return {
    id: row.id,
    staffId: row.staffId,
    type: row.type,
    amount: row.amount.toFixed(2),
    date: toBusinessDate(row.date),
    note: row.note,
  };
}

export type StaffPay = {
  staffId: string;
  staffName: string;
  month: string;
  dailyRate: string;
  /**
   * Business dates in the month that count toward pay: every calendar day
   * from the 1st through the earlier of month-end and today (a future day
   * has not been worked). PRD §4.8: "default present, flag absences".
   */
  payableDays: number;
  /** `payableDays` minus the days with an explicit `present: false` row. */
  daysPresent: number;
  daysAbsent: number;
  /** `dailyRate × daysPresent`, decimal string. */
  grossPay: string;
  advances: string;
  deductions: string;
  /**
   * `grossPay − advances − deductions` (both are netted off — PRD §4.8).
   * **Not floored** — if advances + deductions exceed gross this is
   * negative (ADR-60): the excess is a real over-advance, carried as
   * unpaid `StaffPayAdjustment` rows until the Admin records a correcting
   * entry. A payout is refused while `netPay ≤ 0`.
   */
  netPay: string;
  adjustments: PayAdjustmentView[];
  /**
   * Whether this staff-month has been paid out (M4 S9A). When `paid`, the
   * disbursement created one Salaries `Expense`; `netPay` above is what was
   * owed, `payout.netPaid` is what was actually disbursed (they are equal
   * — the amount is recomputed at payout time, never client-supplied).
   */
  paid: boolean;
  payout: StaffPayoutView | null;
};

/** A recorded monthly disbursement (M4 S9A). Wire shape. */
export type StaffPayoutView = {
  id: string;
  staffId: string;
  month: string;
  /** Net pay disbursed — recomputed from the ledger, always > 0. */
  netPaid: string;
  /** Business date the disbursement is dated to. */
  date: string;
  paidFromAccount: MoneyAccount;
  /** The Salaries `Expense` this payout created. */
  expenseId: string;
};

/**
 * One staff member's pay for a calendar month (`YYYY-MM`). **Admin-only.**
 *
 * gross = dailyRate × daysPresent, where daysPresent is every payable day
 * of the month (1st → min(month-end, today)) minus the days flagged
 * `present: false`. net = gross − Σ advances − Σ deductions.
 *
 * Nothing is stored — every figure is derived from `Staff.dailyRate`, the
 * `Attendance` rows, and the `StaffPayAdjustment` rows (CLAUDE.md: ledgers,
 * not stored totals).
 */
export async function getStaffPay(
  staffId: string,
  month: string,
): Promise<StaffPay> {
  assertMonth(month);

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, name: true, dailyRate: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }

  const { from, to } = businessMonthRange(`${month}-01`);
  const today = nairobiToday();
  const payableTo = to < today ? to : today;
  // A month entirely in the future has no payable days yet.
  const payableDays = payableTo < from ? 0 : daysInRange(from, payableTo);

  const [absentRows, adjRows, payoutRow] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        staffId,
        present: false,
        date: { gte: businessDateOnly(from), lte: businessDateOnly(payableTo) },
      },
      select: { date: true },
    }),
    prisma.staffPayAdjustment.findMany({
      where: {
        staffId,
        date: { gte: businessDateOnly(from), lte: businessDateOnly(to) },
      },
      orderBy: { date: "asc" },
    }),
    prisma.staffPayout.findUnique({
      where: { staffId_month: { staffId, month: monthStartDate(month) } },
    }),
  ]);

  const daysAbsent = payableDays === 0 ? 0 : absentRows.length;
  const daysPresent = payableDays - daysAbsent;

  const dailyRate = staff.dailyRate;
  const grossPay = dailyRate.times(daysPresent);

  let advances = ZERO;
  let deductions = ZERO;
  for (const a of adjRows) {
    if (a.type === "advance") advances = advances.plus(a.amount);
    else deductions = deductions.plus(a.amount);
  }
  const netPay = grossPay.minus(advances).minus(deductions);

  return {
    staffId: staff.id,
    staffName: staff.name,
    month,
    dailyRate: dailyRate.toFixed(2),
    payableDays,
    daysPresent,
    daysAbsent,
    grossPay: grossPay.toFixed(2),
    advances: advances.toFixed(2),
    deductions: deductions.toFixed(2),
    netPay: netPay.toFixed(2),
    adjustments: adjRows.map((a) => ({
      id: a.id,
      staffId: a.staffId,
      type: a.type,
      amount: a.amount.toFixed(2),
      date: toBusinessDate(a.date),
      note: a.note,
    })),
    paid: payoutRow !== null,
    payout: payoutRow ? toPayoutView(payoutRow) : null,
  };
}

export type PayrollSummary = {
  month: string;
  rows: StaffPay[];
  totals: {
    grossPay: string;
    advances: string;
    deductions: string;
    netPay: string;
    /** Σ `payout.netPaid` over the rows already paid this month (M4 S9A). */
    netPaid: string;
    /** Σ `netPay` over the rows NOT yet paid whose net is > 0 (M4 S9A). */
    netUnpaid: string;
    /** How many of `rows` have a recorded payout. */
    paidCount: number;
    /** How many of `rows` are unpaid (`rows.length − paidCount`). */
    unpaidCount: number;
  };
};

/**
 * Payroll for every ACTIVE staff member for a month (`YYYY-MM`).
 * **Admin-only.** Set-wise: one `Attendance` query and one
 * `StaffPayAdjustment` query across all staff, not a per-person loop.
 */
export async function getPayrollSummary(month: string): Promise<PayrollSummary> {
  assertMonth(month);

  const staff = await prisma.staff.findMany({
    where: { active: true },
    select: { id: true, name: true, dailyRate: true },
    orderBy: { name: "asc" },
  });

  const { from, to } = businessMonthRange(`${month}-01`);
  const today = nairobiToday();
  const payableTo = to < today ? to : today;
  const payableDays = payableTo < from ? 0 : daysInRange(from, payableTo);

  if (staff.length === 0) {
    return {
      month,
      rows: [],
      totals: {
        grossPay: "0.00",
        advances: "0.00",
        deductions: "0.00",
        netPay: "0.00",
        netPaid: "0.00",
        netUnpaid: "0.00",
        paidCount: 0,
        unpaidCount: 0,
      },
    };
  }

  const ids = staff.map((s) => s.id);
  const [absentRows, adjRows, payoutRows] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["staffId"],
      where: {
        staffId: { in: ids },
        present: false,
        date: { gte: businessDateOnly(from), lte: businessDateOnly(payableTo) },
      },
      _count: { _all: true },
    }),
    prisma.staffPayAdjustment.findMany({
      where: {
        staffId: { in: ids },
        date: { gte: businessDateOnly(from), lte: businessDateOnly(to) },
      },
      orderBy: { date: "asc" },
    }),
    prisma.staffPayout.findMany({
      where: { staffId: { in: ids }, month: monthStartDate(month) },
    }),
  ]);

  const payoutByStaff = new Map(payoutRows.map((p) => [p.staffId, p]));

  const absentByStaff = new Map(
    absentRows.map((r) => [r.staffId, r._count._all]),
  );
  const adjByStaff = new Map<string, typeof adjRows>();
  for (const a of adjRows) {
    const list = adjByStaff.get(a.staffId) ?? [];
    list.push(a);
    adjByStaff.set(a.staffId, list);
  }

  let tGross = ZERO;
  let tAdv = ZERO;
  let tDed = ZERO;
  let tNet = ZERO;
  let tNetPaid = ZERO;
  let tNetUnpaid = ZERO;
  let paidCount = 0;

  const rows: StaffPay[] = staff.map((s) => {
    const daysAbsent = payableDays === 0 ? 0 : absentByStaff.get(s.id) ?? 0;
    const daysPresent = payableDays - daysAbsent;
    const grossPay = s.dailyRate.times(daysPresent);

    let advances = ZERO;
    let deductions = ZERO;
    const list = adjByStaff.get(s.id) ?? [];
    for (const a of list) {
      if (a.type === "advance") advances = advances.plus(a.amount);
      else deductions = deductions.plus(a.amount);
    }
    const netPay = grossPay.minus(advances).minus(deductions);
    const payout = payoutByStaff.get(s.id) ?? null;

    tGross = tGross.plus(grossPay);
    tAdv = tAdv.plus(advances);
    tDed = tDed.plus(deductions);
    tNet = tNet.plus(netPay);
    if (payout) {
      paidCount += 1;
      tNetPaid = tNetPaid.plus(payout.netPaid);
    } else if (netPay.greaterThan(0)) {
      tNetUnpaid = tNetUnpaid.plus(netPay);
    }

    return {
      staffId: s.id,
      staffName: s.name,
      month,
      dailyRate: s.dailyRate.toFixed(2),
      payableDays,
      daysPresent,
      daysAbsent,
      grossPay: grossPay.toFixed(2),
      advances: advances.toFixed(2),
      deductions: deductions.toFixed(2),
      netPay: netPay.toFixed(2),
      adjustments: list.map((a) => ({
        id: a.id,
        staffId: a.staffId,
        type: a.type,
        amount: a.amount.toFixed(2),
        date: toBusinessDate(a.date),
        note: a.note,
      })),
      paid: payout !== null,
      payout: payout ? toPayoutView(payout) : null,
    };
  });

  return {
    month,
    rows,
    totals: {
      grossPay: tGross.toFixed(2),
      advances: tAdv.toFixed(2),
      deductions: tDed.toFixed(2),
      netPay: tNet.toFixed(2),
      netPaid: tNetPaid.toFixed(2),
      netUnpaid: tNetUnpaid.toFixed(2),
      paidCount,
      unpaidCount: rows.length - paidCount,
    },
  };
}

// ── Payout: disburse a month's pay, post it to the money ledger ─────────
// (M4 S9A — PRD §4.8, ADR-60). A payout creates exactly ONE Salaries
// `Expense` via `recordExpense`; that expense writes its own paired
// negative `MoneyMovement`. Cash drops once, Net Profit drops once,
// through the already-tested path. There is NO bespoke MoneyMovement here
// and NO new `MoneySourceType`.

/** The current business date (`YYYY-MM-DD`, Africa/Nairobi). */
function today(): string {
  return nairobiToday();
}

/** True if `YYYY-MM` is strictly after the month `today()` falls in. */
function isFutureMonth(month: string): boolean {
  return month > today().slice(0, 7);
}

export type PayStaffInput = {
  staffId: string;
  /** The calendar month being paid (`YYYY-MM`). */
  month: string;
  paidFromAccount: MoneyAccount;
  /** Business date the disbursement is dated to (`YYYY-MM-DD`). */
  date: string;
};

const PAYOUT_NOTE = (name: string, month: string) =>
  `Staff pay — ${name} — ${month}`;

/**
 * Core of a single payout, run inside a caller-supplied transaction so the
 * `Expense`, its paired `MoneyMovement`, and the `StaffPayout` row commit
 * together or not at all. Assumes `pay` was just recomputed from the
 * ledger and `pay.netPay > 0` (checked by the caller). Returns the new
 * payout row id.
 *
 * The DB `@@unique([staffId, month])` is the real double-pay guard — a
 * concurrent second call fails here with `P2002`, which the caller maps to
 * `CONFLICT`.
 */
async function writePayout(
  tx: Prisma.TransactionClient,
  pay: StaffPay,
  input: PayStaffInput,
  actor: StaffActor,
): Promise<string> {
  await assertDayOpen(input.date, tx);

  const net = new Prisma.Decimal(pay.netPay);

  const expense = await recordExpense(
    {
      category: "salaries",
      amount: net.toFixed(2),
      date: input.date,
      paidFromAccount: input.paidFromAccount,
      note: PAYOUT_NOTE(pay.staffName, input.month),
    },
    { actorId: actor.actorId, role: actor.role },
    { tx },
  );

  let payout;
  try {
    payout = await tx.staffPayout.create({
      data: {
        staffId: input.staffId,
        month: monthStartDate(input.month),
        netPaid: net,
        date: businessDateOnly(input.date),
        paidFromAccount: input.paidFromAccount,
        recordedById: actor.actorId,
        expenseId: expense.id,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new DomainError(
        "CONFLICT",
        "This staff member has already been paid for this month.",
        "month",
      );
    }
    throw e;
  }

  await tx.auditLog.create({
    data: {
      userId: actor.actorId,
      action: "create",
      entityType: "staff_payout",
      entityId: payout.id,
      newValue: {
        staffId: input.staffId,
        month: input.month,
        netPaid: net.toFixed(2),
        expenseId: expense.id,
        paidFromAccount: input.paidFromAccount,
      },
      occurredAt: businessDateOnly(input.date),
    },
  });

  return payout.id;
}

/**
 * Pay one staff member for a month (M4 S9A). **Admin-only.**
 *
 * In ONE transaction: recompute net pay from the ledger (never trust a
 * client amount — there is no amount in the input), create the Salaries
 * `Expense` via `recordExpense`, write the `StaffPayout` row linking to
 * it. Returns the refreshed `getStaffPay` view (now `paid: true`).
 *
 * Guards (each has a test):
 *   - not admin → `FORBIDDEN`
 *   - malformed month / date → `VALIDATION_ERROR`
 *   - a **future** month → `VALIDATION_ERROR` (nothing has been worked)
 *   - net pay ≤ 0 → `VALIDATION_ERROR` (ADR-60: the over-advance stays as
 *     unpaid adjustments; nothing is disbursed, no negative posts)
 *   - already paid for that month → `CONFLICT` (in code AND at the DB via
 *     `@@unique([staffId, month])`)
 *   - the disbursement date's day is closed → `FORBIDDEN` (`assertDayOpen`)
 */
export async function payStaff(
  input: PayStaffInput,
  actor: StaffActor,
): Promise<StaffPay> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can pay staff.",
    );
  }
  assertMonth(input.month);
  if (!BUSINESS_DATE_RE.test(input.date)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Date must be a YYYY-MM-DD business date.",
      "date",
    );
  }
  if (isFutureMonth(input.month)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "That month is in the future — there is no pay to disburse yet.",
      "month",
    );
  }

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { id: true, active: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }

  // Recompute from the ledger — this is the ONLY source of the amount.
  const pay = await getStaffPay(input.staffId, input.month);
  if (pay.paid) {
    throw new DomainError(
      "CONFLICT",
      "This staff member has already been paid for this month.",
      "month",
    );
  }
  if (new Prisma.Decimal(pay.netPay).lessThanOrEqualTo(0)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Net pay for this month is zero or less — nothing to disburse. Advances and deductions already recorded exceed what was earned; the excess stays on the books until you record a correcting entry.",
      "net",
    );
  }

  await prisma.$transaction((tx) => writePayout(tx, pay, input, actor));

  return getStaffPay(input.staffId, input.month);
}

export type PayAllUnpaidInput = {
  month: string;
  paidFromAccount: MoneyAccount;
  date: string;
};

export type PayAllUnpaidResult = {
  month: string;
  paid: StaffPayoutView[];
  skipped: { staffId: string; staffName: string; reason: string }[];
};

/**
 * Pay every unpaid ACTIVE staff member for a month (M4 S9A). **Admin-only.**
 *
 * Each staff member's `Expense` + `StaffPayout` is its OWN transaction —
 * one failure (a race that already paid them, a zero net) is *skipped*,
 * not a rollback of the whole batch. One `Expense` per staff member paid.
 *
 * Skips, with a reason, any staff member who: is already paid, or whose
 * net pay is ≤ 0 for the month. A future month → `VALIDATION_ERROR` (the
 * whole call, nothing to do).
 */
export async function payAllUnpaid(
  input: PayAllUnpaidInput,
  actor: StaffActor,
): Promise<PayAllUnpaidResult> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can pay staff.",
    );
  }
  assertMonth(input.month);
  if (!BUSINESS_DATE_RE.test(input.date)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Date must be a YYYY-MM-DD business date.",
      "date",
    );
  }
  if (isFutureMonth(input.month)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "That month is in the future — there is no pay to disburse yet.",
      "month",
    );
  }

  const summary = await getPayrollSummary(input.month);

  const paid: StaffPayoutView[] = [];
  const skipped: PayAllUnpaidResult["skipped"] = [];

  for (const row of summary.rows) {
    if (row.paid) {
      skipped.push({
        staffId: row.staffId,
        staffName: row.staffName,
        reason: "already paid for this month",
      });
      continue;
    }
    if (new Prisma.Decimal(row.netPay).lessThanOrEqualTo(0)) {
      skipped.push({
        staffId: row.staffId,
        staffName: row.staffName,
        reason: "net pay is zero or less — nothing to disburse",
      });
      continue;
    }

    const one: PayStaffInput = {
      staffId: row.staffId,
      month: input.month,
      paidFromAccount: input.paidFromAccount,
      date: input.date,
    };
    try {
      // Re-read inside so a concurrent payout / a just-added adjustment is
      // reflected; `writePayout` also has the DB unique as a backstop.
      const fresh = await getStaffPay(row.staffId, input.month);
      if (fresh.paid) {
        skipped.push({
          staffId: row.staffId,
          staffName: row.staffName,
          reason: "already paid for this month",
        });
        continue;
      }
      if (new Prisma.Decimal(fresh.netPay).lessThanOrEqualTo(0)) {
        skipped.push({
          staffId: row.staffId,
          staffName: row.staffName,
          reason: "net pay is zero or less — nothing to disburse",
        });
        continue;
      }
      await prisma.$transaction((tx) => writePayout(tx, fresh, one, actor));
      const after = await getStaffPay(row.staffId, input.month);
      if (after.payout) paid.push(after.payout);
    } catch (e) {
      if (e instanceof DomainError && e.code === "CONFLICT") {
        skipped.push({
          staffId: row.staffId,
          staffName: row.staffName,
          reason: "already paid for this month",
        });
        continue;
      }
      // A closed day (FORBIDDEN) or anything unexpected must not be
      // swallowed — the caller needs to know the batch could not run.
      throw e;
    }
  }

  return { month: input.month, paid, skipped };
}
