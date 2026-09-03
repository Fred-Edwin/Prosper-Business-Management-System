import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
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
  /** `grossPay − advances − deductions` (both are netted off — PRD §4.8). */
  netPay: string;
  adjustments: PayAdjustmentView[];
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

  const [absentRows, adjRows] = await Promise.all([
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
      },
    };
  }

  const ids = staff.map((s) => s.id);
  const [absentRows, adjRows] = await Promise.all([
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
  ]);

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

    tGross = tGross.plus(grossPay);
    tAdv = tAdv.plus(advances);
    tDed = tDed.plus(deductions);
    tNet = tNet.plus(netPay);

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
    },
  };
}
