import { prisma } from "@/lib/db";
import { businessDateOnly, toBusinessDate } from "@/lib/time";
import { DomainError } from "./errors";
import type { StaffActor } from "./types";

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

export type AttendanceView = {
  staffId: string;
  /** YYYY-MM-DD Africa/Nairobi business date. */
  date: string;
  present: boolean;
};

/**
 * DAY-CLOSE DECISION (M4 S8A). `assertDayOpen` is **deliberately NOT
 * applied** to attendance.
 *
 * Reasoning: attendance is a *record about* a day (was this person here?),
 * not a ledger entry that moves a stock or money balance. The owner's
 * decision is that the Admin can backdate attendance (ADR-53 exempt) —
 * and the reason to backdate is precisely to correct a past day. If
 * attendance were day-close gated, a closed day's attendance could never
 * be fixed, yet pay (`getStaffPay` / `getPayrollSummary`) is computed
 * directly from it. Gating it would make a wrong mark on a closed day
 * permanent and silently wrong the payroll.
 *
 * The upsert is idempotent by construction (unique `[staffId, date]`), so
 * "correcting" attendance is just re-setting the value — there is no
 * append-only row to protect. Admin-only is the real guard here.
 */
export async function setAttendance(
  staffId: string,
  date: string,
  present: boolean,
  actor: StaffActor,
): Promise<AttendanceView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can set attendance.",
    );
  }
  assertBusinessDate(date);

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }

  const dateOnly = businessDateOnly(date);
  const row = await prisma.attendance.upsert({
    where: { staffId_date: { staffId, date: dateOnly } },
    create: { staffId, date: dateOnly, present },
    update: { present },
  });

  return { staffId: row.staffId, date: toBusinessDate(row.date), present: row.present };
}

export type BulkAttendanceEntry = { staffId: string; present: boolean };

/**
 * Mark attendance for MANY staff on ONE date, in one transaction — how the
 * screen marks a day. Admin-only. Same no-day-close-gate reasoning as
 * `setAttendance`. Every `staffId` must exist (checked up front) or the
 * whole batch is rejected — nothing is written.
 */
export async function setAttendanceBulk(
  date: string,
  entries: BulkAttendanceEntry[],
  actor: StaffActor,
): Promise<AttendanceView[]> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can set attendance.",
    );
  }
  assertBusinessDate(date);

  if (entries.length === 0) return [];

  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.staffId)) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "A staff member was listed twice.",
        "entries",
      );
    }
    seen.add(e.staffId);
  }

  const ids = [...seen];
  const found = await prisma.staff.count({ where: { id: { in: ids } } });
  if (found !== ids.length) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "One or more staff members do not exist.",
      "entries",
    );
  }

  const dateOnly = businessDateOnly(date);
  const rows = await prisma.$transaction(
    entries.map((e) =>
      prisma.attendance.upsert({
        where: { staffId_date: { staffId: e.staffId, date: dateOnly } },
        create: { staffId: e.staffId, date: dateOnly, present: e.present },
        update: { present: e.present },
      }),
    ),
  );

  return rows.map((r) => ({
    staffId: r.staffId,
    date: toBusinessDate(r.date),
    present: r.present,
  }));
}

/**
 * Attendance rows in `[from, to]` (inclusive, YYYY-MM-DD business dates).
 * For the screen and for pay. **Admin-only.**
 *
 * NOTE — default present (PRD §4.8 "default present, flag absences"): a
 * staff member with NO row for a date counts as **present**. This read
 * returns only the rows that exist; the caller treats a missing
 * (staffId, date) as present. `getStaffPay` / `getPayrollSummary` do
 * exactly that.
 */
export async function listAttendance(
  from: string,
  to: string,
  opts: { staffId?: string } = {},
): Promise<AttendanceView[]> {
  assertBusinessDate(from, "from");
  assertBusinessDate(to, "to");
  if (from > to) {
    throw new DomainError("VALIDATION_ERROR", "`from` must be on or before `to`.", "from");
  }

  const rows = await prisma.attendance.findMany({
    where: {
      date: { gte: businessDateOnly(from), lte: businessDateOnly(to) },
      ...(opts.staffId ? { staffId: opts.staffId } : {}),
    },
    orderBy: [{ date: "asc" }, { staffId: "asc" }],
  });

  return rows.map((r) => ({
    staffId: r.staffId,
    date: toBusinessDate(r.date),
    present: r.present,
  }));
}
