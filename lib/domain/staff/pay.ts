import { Prisma, type MoneyAccount, type StaffPayModel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
import { recordExpense, recordMoneyMovement } from "@/lib/domain/financials";
import {
  businessDateOnly,
  businessMonthRange,
  nairobiToday,
  toBusinessDate,
} from "@/lib/time";
import { type DailyPayView, toDailyPayViews } from "./daily-pay";
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
  reversedAt: Date | null;
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
    reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
  };
}

export type PayAdjustmentType = "advance" | "deduction";

export type PayAdjustmentView = {
  id: string;
  staffId: string;
  type: PayAdjustmentType;
  /**
   * The row's CURRENT magnitude — the original amount plus any ADR-72
   * correction deltas linked to it. This is the figure that nets into
   * `advances` / `deductions` and the value the Correct drawer prefills.
   * A voided adjustment reads `"0.00"`.
   */
  amount: string;
  /** The as-recorded amount before any correction (audit reference). */
  originalAmount: string;
  /** True once one or more correction rows point at this adjustment. */
  corrected: boolean;
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

type AdjRow = {
  id: string;
  staffId: string;
  type: PayAdjustmentType;
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
  correctsAdjustmentId: string | null;
};

/**
 * Collapse a month's `StaffPayAdjustment` rows to one view per ORIGINAL,
 * folding each ADR-72 correction delta into its target's `amount`. A
 * correction row is never surfaced standalone (ADR-72: list reads fold
 * corrections into the derived value). Ordered by the original's date.
 */
function toAdjustmentViews(rows: AdjRow[]): PayAdjustmentView[] {
  const deltaByOriginal = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    if (r.correctsAdjustmentId === null) continue;
    const acc = deltaByOriginal.get(r.correctsAdjustmentId) ?? ZERO;
    deltaByOriginal.set(r.correctsAdjustmentId, acc.plus(r.amount));
  }
  return rows
    .filter((r) => r.correctsAdjustmentId === null)
    .map((r) => {
      const delta = deltaByOriginal.get(r.id);
      const current = delta ? r.amount.plus(delta) : r.amount;
      return {
        id: r.id,
        staffId: r.staffId,
        type: r.type,
        amount: current.toFixed(2),
        originalAmount: r.amount.toFixed(2),
        corrected: delta !== undefined,
        date: toBusinessDate(r.date),
        note: r.note,
      };
    });
}

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
    originalAmount: row.amount.toFixed(2),
    corrected: false,
    date: toBusinessDate(row.date),
    note: row.note,
  };
}

export type StaffPay = {
  staffId: string;
  staffName: string;
  month: string;
  /**
   * Which pay model this staff member is on (ADR-76).
   *   - `fixed_daily_rate` → `grossPay` = `dailyRate × daysPresent`; the
   *     `dailyRate` / `daysPresent` / `payableDays` columns are meaningful.
   *   - `daily_entry` → `grossPay` = Σ `dailyPay` rows for the month;
   *     `dailyRate` is carried for reference only and the days columns
   *     still reflect attendance (recorded + shown) but do NOT feed gross.
   */
  payModel: StaffPayModel;
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
  /**
   * `fixed_daily_rate` → `dailyRate × daysPresent`.
   * `daily_entry` → Σ the month's `StaffDailyPay` rows (originals +
   * correction deltas). Decimal string.
   */
  grossPay: string;
  /**
   * The `daily_entry` staff member's per-day pay entries for the month
   * (one view per original, corrections folded in; a voided entry reads
   * `"0.00"`). Empty for a `fixed_daily_rate` staff member.
   */
  dailyPay: DailyPayView[];
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
   * Σ `netPaid` over this month's LIVE payouts (staff-pay rework PR 3 — a
   * staff-month accrues many partial disbursements, not one). A reversed
   * payout (ADR-73) does not count. Decimal string.
   */
  netPaid: string;
  /**
   * `netPay − netPaid` — how much of the month's net is still owed.
   * **Not floored** (consistent with ADR-60's `netPay`): if adjustments
   * landed after a payout and drove `netPay` below what was already
   * disbursed, this reads negative. A further payout's `amount` must be
   * `≤` this; `netRemaining ≤ 0` refuses a payout the same way `netPay ≤
   * 0` does.
   */
  netRemaining: string;
  /**
   * Whether this staff-month is fully settled — `netRemaining <= 0` **and**
   * at least one payout was recorded (`netPaid > 0`). An over-advanced
   * month with nothing disbursed (`netPay ≤ 0`, no payouts) is **not**
   * "paid" — nothing moved (ADR-60): it reads `paid: false` and the
   * over-advance stays as adjustments until the Admin corrects it. Each
   * live payout created its own Salaries `Expense`; `netPay` above is what
   * was owed, `netPaid` is what has been disbursed so far.
   */
  paid: boolean;
  /**
   * This month's LIVE payouts, oldest first (staff-pay rework PR 3). A
   * reversed payout (ADR-73) is not included. Empty when nothing has been
   * disbursed yet.
   */
  payouts: StaffPayoutView[];
};

/** One recorded partial disbursement of a staff-month's net. Wire shape. */
export type StaffPayoutView = {
  id: string;
  staffId: string;
  month: string;
  /** This instalment's amount — Admin-entered, `> 0`, `≤` the then-remaining net. */
  netPaid: string;
  /** Business date the disbursement is dated to. */
  date: string;
  paidFromAccount: MoneyAccount;
  /** The Salaries `Expense` this payout created. */
  expenseId: string;
  /**
   * ISO instant the payout was reversed (ADR-73), else `null`. A live
   * payout (the only kind `getStaffPay.payouts` returns) is always `null`
   * here; the field carries history for a reversed-payout view.
   */
  reversedAt: string | null;
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
    select: { id: true, name: true, dailyRate: true, payModel: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }

  const { from, to } = businessMonthRange(`${month}-01`);
  const today = nairobiToday();
  const payableTo = to < today ? to : today;
  // A month entirely in the future has no payable days yet.
  const payableDays = payableTo < from ? 0 : daysInRange(from, payableTo);

  const [absentRows, adjRows, dailyPayRows, payoutRows] = await Promise.all([
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
    // Daily-entry pay rows for the month (originals + correction deltas).
    // Empty / ignored for a `fixed_daily_rate` staff member.
    staff.payModel === "daily_entry"
      ? prisma.staffDailyPay.findMany({
          where: {
            staffId,
            date: { gte: businessDateOnly(from), lte: businessDateOnly(to) },
          },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    // Every LIVE payout for the month — a staff-month accrues many partial
    // disbursements (staff-pay rework PR 3). A reversed one (ADR-73) frees
    // its slice of the net. Oldest first — the instalment order.
    prisma.staffPayout.findMany({
      where: { staffId, month: monthStartDate(month), reversedAt: null },
      orderBy: { date: "asc" },
    }),
  ]);

  const daysAbsent = payableDays === 0 ? 0 : absentRows.length;
  const daysPresent = payableDays - daysAbsent;

  const dailyRate = staff.dailyRate;
  // `daily_entry` → gross is the sum of every daily pay row (originals +
  // signed correction deltas) so a corrected / voided entry nets in.
  // `fixed_daily_rate` → the original `rate × days present`.
  const grossPay =
    staff.payModel === "daily_entry"
      ? dailyPayRows.reduce((acc, r) => acc.plus(r.amount), ZERO)
      : dailyRate.times(daysPresent);
  const dailyPayViews =
    staff.payModel === "daily_entry" ? toDailyPayViews(dailyPayRows) : [];

  // Sum EVERY row (originals + ADR-72 correction deltas, which carry a
  // signed `amount` and keep the original's `type`) so a corrected /
  // voided adjustment nets correctly. The `adjustments` list below shows
  // only originals — a correction row is never surfaced standalone.
  let advances = ZERO;
  let deductions = ZERO;
  for (const a of adjRows) {
    if (a.type === "advance") advances = advances.plus(a.amount);
    else deductions = deductions.plus(a.amount);
  }
  const netPay = grossPay.minus(advances).minus(deductions);
  const adjViews = toAdjustmentViews(adjRows);

  const netPaid = payoutRows.reduce((acc, p) => acc.plus(p.netPaid), ZERO);
  const netRemaining = netPay.minus(netPaid);
  const settled = netRemaining.lessThanOrEqualTo(0) && netPaid.greaterThan(0);

  return {
    staffId: staff.id,
    staffName: staff.name,
    month,
    payModel: staff.payModel,
    dailyRate: dailyRate.toFixed(2),
    payableDays,
    daysPresent,
    daysAbsent,
    grossPay: grossPay.toFixed(2),
    dailyPay: dailyPayViews,
    advances: advances.toFixed(2),
    deductions: deductions.toFixed(2),
    netPay: netPay.toFixed(2),
    adjustments: adjViews,
    netPaid: netPaid.toFixed(2),
    netRemaining: netRemaining.toFixed(2),
    paid: settled,
    payouts: payoutRows.map(toPayoutView),
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
    /** Σ `netPaid` over the rows — every live partial payout this month. */
    netPaid: string;
    /** Σ `netRemaining` over the rows whose remaining net is still > 0. */
    netUnpaid: string;
    /** How many of `rows` are fully settled (`paid` — see `StaffPay.paid`). */
    paidCount: number;
    /** How many of `rows` are not fully settled (`rows.length − paidCount`). */
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
    select: { id: true, name: true, dailyRate: true, payModel: true },
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
  const dailyEntryIds = staff
    .filter((s) => s.payModel === "daily_entry")
    .map((s) => s.id);
  const [absentRows, adjRows, dailyPayRows, payoutRows] = await Promise.all([
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
    dailyEntryIds.length > 0
      ? prisma.staffDailyPay.findMany({
          where: {
            staffId: { in: dailyEntryIds },
            date: { gte: businessDateOnly(from), lte: businessDateOnly(to) },
          },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    prisma.staffPayout.findMany({
      // Every LIVE payout — a staff-month accrues many partials (PR 3); a
      // reversed one (ADR-73) frees its slice. Oldest first per staff.
      where: { staffId: { in: ids }, month: monthStartDate(month), reversedAt: null },
      orderBy: { date: "asc" },
    }),
  ]);

  const payoutsByStaff = new Map<string, typeof payoutRows>();
  for (const p of payoutRows) {
    const list = payoutsByStaff.get(p.staffId) ?? [];
    list.push(p);
    payoutsByStaff.set(p.staffId, list);
  }

  const absentByStaff = new Map(
    absentRows.map((r) => [r.staffId, r._count._all]),
  );
  const adjByStaff = new Map<string, typeof adjRows>();
  for (const a of adjRows) {
    const list = adjByStaff.get(a.staffId) ?? [];
    list.push(a);
    adjByStaff.set(a.staffId, list);
  }
  const dailyPayByStaff = new Map<string, typeof dailyPayRows>();
  for (const d of dailyPayRows) {
    const list = dailyPayByStaff.get(d.staffId) ?? [];
    list.push(d);
    dailyPayByStaff.set(d.staffId, list);
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
    const dpList = dailyPayByStaff.get(s.id) ?? [];
    const grossPay =
      s.payModel === "daily_entry"
        ? dpList.reduce((acc, r) => acc.plus(r.amount), ZERO)
        : s.dailyRate.times(daysPresent);
    const dailyPayViews =
      s.payModel === "daily_entry" ? toDailyPayViews(dpList) : [];

    let advances = ZERO;
    let deductions = ZERO;
    const list = adjByStaff.get(s.id) ?? [];
    for (const a of list) {
      if (a.type === "advance") advances = advances.plus(a.amount);
      else deductions = deductions.plus(a.amount);
    }
    const netPay = grossPay.minus(advances).minus(deductions);
    const payouts = payoutsByStaff.get(s.id) ?? [];
    const netPaid = payouts.reduce((acc, p) => acc.plus(p.netPaid), ZERO);
    const netRemaining = netPay.minus(netPaid);
    const settled = netRemaining.lessThanOrEqualTo(0) && netPaid.greaterThan(0);

    tGross = tGross.plus(grossPay);
    tAdv = tAdv.plus(advances);
    tDed = tDed.plus(deductions);
    tNet = tNet.plus(netPay);
    tNetPaid = tNetPaid.plus(netPaid);
    if (netRemaining.greaterThan(0)) {
      tNetUnpaid = tNetUnpaid.plus(netRemaining);
    }
    if (settled) paidCount += 1;

    return {
      staffId: s.id,
      staffName: s.name,
      month,
      payModel: s.payModel,
      dailyRate: s.dailyRate.toFixed(2),
      payableDays,
      daysPresent,
      daysAbsent,
      grossPay: grossPay.toFixed(2),
      dailyPay: dailyPayViews,
      advances: advances.toFixed(2),
      deductions: deductions.toFixed(2),
      netPay: netPay.toFixed(2),
      adjustments: toAdjustmentViews(list),
      netPaid: netPaid.toFixed(2),
      netRemaining: netRemaining.toFixed(2),
      paid: settled,
      payouts: payouts.map(toPayoutView),
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
  /**
   * This instalment's amount (decimal string, `> 0`). Admin-entered
   * (staff-pay rework PR 3 — a staff-month accrues many partial payouts).
   * Bounded: `≤` the month's remaining net (`getStaffPay.netRemaining`).
   * "Pay the whole balance" is just `amount = netRemaining`.
   */
  amount: string;
};

const PAYOUT_NOTE = (name: string, month: string) =>
  `Staff pay — ${name} — ${month}`;

/**
 * Core of a single partial payout, run inside a caller-supplied
 * transaction so the `Expense`, its paired `MoneyMovement`, and the
 * `StaffPayout` row commit together or not at all. `amount` is the
 * caller-validated instalment (a positive `Decimal`, already checked `≤`
 * the month's remaining net). Returns the new payout row id.
 *
 * A staff-month accrues many live payouts now (staff-pay rework PR 3) —
 * there is no `@@unique([staffId, month])` guard any more; the `≤
 * remaining` bound in `payStaff` is what stops an over-payment.
 */
async function writePayout(
  tx: Prisma.TransactionClient,
  pay: StaffPay,
  input: PayStaffInput,
  amount: Prisma.Decimal,
  actor: StaffActor,
): Promise<string> {
  await assertDayOpen(input.date, tx);

  const expense = await recordExpense(
    {
      category: "salaries",
      amount: amount.toFixed(2),
      date: input.date,
      paidFromAccount: input.paidFromAccount,
      note: PAYOUT_NOTE(pay.staffName, input.month),
    },
    { actorId: actor.actorId, role: actor.role },
    { tx },
  );

  const payout = await tx.staffPayout.create({
    data: {
      staffId: input.staffId,
      month: monthStartDate(input.month),
      netPaid: amount,
      date: businessDateOnly(input.date),
      paidFromAccount: input.paidFromAccount,
      recordedById: actor.actorId,
      expenseId: expense.id,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: actor.actorId,
      action: "create",
      entityType: "staff_payout",
      entityId: payout.id,
      newValue: {
        staffId: input.staffId,
        month: input.month,
        netPaid: amount.toFixed(2),
        expenseId: expense.id,
        paidFromAccount: input.paidFromAccount,
      },
      occurredAt: businessDateOnly(input.date),
    },
  });

  return payout.id;
}

/**
 * Record one partial payout for a staff member's month (staff-pay rework
 * PR 3, per ADR-60). **Admin-only.**
 *
 * A staff-month accrues N payouts — instalments across the month. Each
 * call disburses an **Admin-entered** `amount`, bounded to the month's
 * remaining net (`getStaffPay.netRemaining` = `netPay − Σ live payouts`),
 * and posts its own Salaries `Expense` via `recordExpense` (one paired
 * negative `MoneyMovement`, the ADR-60 path, unchanged). Returns the
 * refreshed `getStaffPay` view.
 *
 * Guards (each has a test):
 *   - not admin → `FORBIDDEN`
 *   - malformed month / date / amount → `VALIDATION_ERROR`
 *   - a **future** month → `VALIDATION_ERROR` (nothing has been worked)
 *   - remaining net ≤ 0 → `VALIDATION_ERROR` (`field: "net"`) — the same
 *     "nothing to disburse" rejection `netPay ≤ 0` gives (ADR-60: an
 *     over-advance stays as adjustments; nothing is disbursed)
 *   - `amount` > remaining net → `VALIDATION_ERROR` (`field: "amount"`)
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
  const trimmedAmount = (input.amount ?? "").trim();
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

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { id: true, active: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }

  // Recompute from the ledger — the remaining net is the ONLY bound on
  // the Admin-entered amount.
  const pay = await getStaffPay(input.staffId, input.month);
  const remaining = new Prisma.Decimal(pay.netRemaining);
  if (remaining.lessThanOrEqualTo(0)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "There is nothing left to disburse for this month — the net is fully paid, or advances and deductions already recorded exceed what was earned.",
      "net",
    );
  }
  if (amount.greaterThan(remaining)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `That is more than the ${remaining.toFixed(2)} still owed for this month. Enter that or less.`,
      "amount",
    );
  }

  await prisma.$transaction((tx) => writePayout(tx, pay, input, amount, actor));

  return getStaffPay(input.staffId, input.month);
}

/**
 * Reverse a recorded staff payout (ADR-73, per ADR-72's deferred list).
 * **Admin-only.** A payout's entire money/profit effect lives in the
 * Salaries `Expense` it created, so a reversal:
 *
 *   1. loads the payout (never mutated) — rejects if the id is unknown
 *      (`NOT_FOUND`) or it is already reversed (`reversedAt` set →
 *      `CONFLICT`);
 *   2. computes the linked expense's CURRENT derived amount
 *      (`original + Σ any ADR-15 correction deltas an Admin already
 *      applied via Financials → Expenses) and, if that is non-zero,
 *      writes ONE offsetting `Expense` correction row
 *      (`correctsExpenseId` = the expense id, `amount` = −currentDerived)
 *      plus its paired positive `MoneyMovement`, restoring Cash and Net
 *      Profit — the same body `correctExpense` uses (that function rejects
 *      `"0.00"`, so it cannot be called directly for a full zero-out);
 *   3. stamps `StaffPayout.reversedAt`. From then on `getStaffPay` /
 *      `getPayrollSummary` / `payStaff` ignore this row (they filter
 *      `reversedAt: null`), so the staff-month is **payable again** — a
 *      fresh `payStaff` writes a new payout + a new Salaries `Expense`.
 *
 * All in ONE transaction. The disbursement date's day being closed does
 * **not** block a reversal — an Admin delta row is always allowed (ADR-72
 * rule §1: `correctX` is never day-close gated).
 *
 * Guards (each has a test):
 *   - not admin → `FORBIDDEN`
 *   - payout id unknown → `NOT_FOUND`
 *   - already reversed → `CONFLICT`
 */
export async function reversePayout(
  payoutId: string,
  actor: StaffActor,
): Promise<StaffPayoutView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can reverse a payout.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const payout = await tx.staffPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new DomainError("NOT_FOUND", "Payout not found.", "payoutId");
    }
    if (payout.reversedAt !== null) {
      throw new DomainError(
        "CONFLICT",
        "This payout has already been reversed.",
        "payoutId",
      );
    }

    // Zero out the linked Salaries Expense. Fold in any correction deltas
    // an Admin already applied to that expense so we offset its CURRENT
    // derived value, not its as-recorded amount.
    const expense = await tx.expense.findUniqueOrThrow({
      where: { id: payout.expenseId },
    });
    const priorDeltas = await tx.expense.aggregate({
      _sum: { amount: true },
      where: { correctsExpenseId: expense.id },
    });
    const currentValue = expense.amount.add(priorDeltas._sum.amount ?? 0);
    const delta = currentValue.negated();

    if (!delta.isZero()) {
      const note = `Reversed staff payout — ${toBusinessDate(payout.date)}`;
      const correction = await tx.expense.create({
        data: {
          category: expense.category,
          amount: delta,
          date: expense.date,
          paidFromAccount: expense.paidFromAccount,
          note,
          recordedById: actor.actorId,
          correctsExpenseId: expense.id,
        },
      });

      // Paired money delta — a positive amount: the Salaries expense
      // shrank to zero, so the cash goes back to `paidFromAccount`.
      await recordMoneyMovement(
        {
          account: expense.paidFromAccount,
          amount: delta.negated(),
          sourceType: "expense",
          sourceId: correction.id,
          occurredAt: expense.date,
          note,
        },
        { actorId: actor.actorId, tx },
      );

      await tx.auditLog.create({
        data: {
          userId: actor.actorId,
          action: "correct",
          entityType: "expense",
          entityId: expense.id,
          newValue: {
            correctionId: correction.id,
            amountTo: "0.00",
            amountDelta: delta.toFixed(2),
          },
          occurredAt: expense.date,
        },
      });
    }

    const reversed = await tx.staffPayout.update({
      where: { id: payout.id },
      data: { reversedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "staff_payout",
        entityId: payout.id,
        oldValue: {
          reversedAt: null,
          netPaid: payout.netPaid.toFixed(2),
        },
        newValue: {
          reversedAt: reversed.reversedAt?.toISOString() ?? null,
          netPaid: "0.00",
        },
        occurredAt: businessDateOnly(toBusinessDate(payout.date)),
      },
    });
  });

  const row = await prisma.staffPayout.findUniqueOrThrow({
    where: { id: payoutId },
  });
  return toPayoutView(row);
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
 * Pay the remaining balance for every ACTIVE staff member for a month
 * (staff-pay rework PR 3, per ADR-60). **Admin-only.**
 *
 * "Pay the remaining balance each" — for a staff-month already part-paid
 * this disburses only `netRemaining`, adding one more partial payout;
 * fully-settled staff-months are skipped. Each staff member's `Expense` +
 * `StaffPayout` is its OWN transaction — one failure is *skipped*, not a
 * rollback of the whole batch. One `Expense` per staff member paid.
 *
 * Skips, with a reason, any staff member whose remaining net is ≤ 0
 * (fully settled, or advances/deductions exceed earnings). A future month
 * → `VALIDATION_ERROR` (the whole call, nothing to do).
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

  const settledReason = "the month's net is fully paid — nothing left to disburse";
  const overAdvancedReason =
    "net pay is zero or less — nothing to disburse";

  for (const row of summary.rows) {
    const rowRemaining = new Prisma.Decimal(row.netRemaining);
    if (rowRemaining.lessThanOrEqualTo(0)) {
      skipped.push({
        staffId: row.staffId,
        staffName: row.staffName,
        reason:
          row.payouts.length > 0 || new Prisma.Decimal(row.netPay).greaterThan(0)
            ? settledReason
            : overAdvancedReason,
      });
      continue;
    }

    // Re-read so a concurrent payout / a just-added adjustment is
    // reflected — the amount is the freshly-computed remaining net. A
    // closed day (FORBIDDEN) or anything unexpected is NOT swallowed: it
    // propagates so the caller knows the batch could not run.
    const fresh = await getStaffPay(row.staffId, input.month);
    const remaining = new Prisma.Decimal(fresh.netRemaining);
    if (remaining.lessThanOrEqualTo(0)) {
      skipped.push({
        staffId: row.staffId,
        staffName: row.staffName,
        reason:
          fresh.payouts.length > 0 ||
          new Prisma.Decimal(fresh.netPay).greaterThan(0)
            ? settledReason
            : overAdvancedReason,
      });
      continue;
    }
    const one: PayStaffInput = {
      staffId: row.staffId,
      month: input.month,
      paidFromAccount: input.paidFromAccount,
      date: input.date,
      amount: remaining.toFixed(2),
    };
    const payoutId = await prisma.$transaction((tx) =>
      writePayout(tx, fresh, one, remaining, actor),
    );
    const created = await prisma.staffPayout.findUniqueOrThrow({
      where: { id: payoutId },
    });
    paid.push(toPayoutView(created));
  }

  return { month: input.month, paid, skipped };
}
