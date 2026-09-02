import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toBusinessDate, businessDateOnly } from "@/lib/time";
import { DomainError } from "./errors";

/**
 * Staff may only create or edit records dated to **today** (Africa/Nairobi
 * business date) — ADR-53. Session 1 removed the old inline "is the
 * business date today?" heuristic when `DayClose` went live; the owner
 * then decided a staff member must still not be able to write to an
 * arbitrary not-yet-closed past or future date.
 *
 *   - `actor.role === "admin"` → **not restricted** (an Admin records and
 *     corrects on past dates, subject only to the day-close rules).
 *   - Any other role, `value`'s business date ≠ today → `FORBIDDEN`.
 *
 * This is **in addition to** `assertDayOpen`, never a replacement — a
 * staff create path calls both (blocked on a closed day AND on any
 * non-today date). `value` may be a `Date` instant or a `YYYY-MM-DD`
 * business-date string.
 */
export function assertStaffDateIsToday(
  value: DateOrBusinessDate,
  actor: { role: string },
): void {
  if (actor.role === "admin") return;
  const target = toBusinessDateString(value);
  const today = toBusinessDate(new Date());
  if (target !== today) {
    throw new DomainError(
      "FORBIDDEN",
      "You can only record or edit entries dated today.",
    );
  }
}

/**
 * The **one** implementation of "is this business date sealed?" (ADR-52).
 *
 * Before this existed, day-close was enforced in a single place —
 * `lib/domain/stock/correct-movement.ts` did an inline
 * `tx.dayClose.findUnique`. Every ledger write path in
 * `stock` / `sales` / `customers` / `financials` now routes through the
 * helpers here so the rule has exactly one definition:
 *
 *   - A **fresh entry** (create) dated to a closed day is rejected for
 *     everyone — staff *and* Admin. The Admin's route back in is the
 *     correction path (`correctMovement` / `correctOrder` / …), never a
 *     new primary row on a sealed date. → `assertDayOpen`.
 *   - A **correction** of a row on a closed day is Admin-only; on an open
 *     day the Admin *or* the original recorder may do it. →
 *     `assertActorMayCorrectOnDate`.
 *
 * All helpers take an optional `tx` so a caller already inside
 * `prisma.$transaction` reads the same snapshot as its writes; with no
 * `tx` they use the shared client.
 */

type Db = Prisma.TransactionClient | typeof prisma;

/** A `Date` instant, or a `YYYY-MM-DD` business-date string. */
export type DateOrBusinessDate = Date | string;

function toBusinessDateString(value: DateOrBusinessDate): string {
  return value instanceof Date ? toBusinessDate(value) : value;
}

/**
 * `true` when a `DayClose` row exists for the Africa/Nairobi business date
 * that `value` falls on. `value` may be a UTC `Date` instant or an
 * already-resolved `YYYY-MM-DD` business-date string.
 */
export async function isDayClosed(
  value: DateOrBusinessDate,
  db: Db = prisma,
): Promise<boolean> {
  const businessDate = toBusinessDateString(value);
  const row = await db.dayClose.findUnique({
    where: { date: businessDateOnly(businessDate) },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Throw `FORBIDDEN` if `value`'s business date is sealed. Use this in
 * every **create** path — recording a new order, stock movement, count,
 * repayment, money movement. No actor argument: nobody writes a fresh
 * primary row on a closed day; the Admin corrects instead.
 */
export async function assertDayOpen(
  value: DateOrBusinessDate,
  db: Db = prisma,
): Promise<void> {
  if (await isDayClosed(value, db)) {
    throw new DomainError(
      "FORBIDDEN",
      "This day is closed. Reopen the date, or record this as a correction.",
    );
  }
}

/**
 * The gate for a **correction** of an existing row (CONVENTIONS §4.6).
 *
 *   - Closed day  → only `role === "admin"` may proceed.
 *   - Open day    → `admin` **or** the original recorder
 *     (`actorUserId === originalRecordedById`) may proceed.
 *   - Anyone else → `FORBIDDEN`.
 */
export async function assertActorMayCorrectOnDate(
  value: DateOrBusinessDate,
  actor: { userId: string; role: string },
  originalRecordedById: string,
  db: Db = prisma,
): Promise<void> {
  const closed = await isDayClosed(value, db);
  const isAdmin = actor.role === "admin";
  const isOriginalRecorder = actor.userId === originalRecordedById;

  if (closed) {
    if (!isAdmin) {
      throw new DomainError(
        "FORBIDDEN",
        "This day is closed — only an administrator can correct it.",
      );
    }
    return;
  }

  if (!isAdmin && !isOriginalRecorder) {
    throw new DomainError(
      "FORBIDDEN",
      "Only the person who recorded this, or an administrator, can correct it.",
    );
  }
}
