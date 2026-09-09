import { prisma } from "@/lib/db";
import { businessDateStartUtc } from "@/lib/time";
import { DomainError } from "./errors";
import { HANDOVER_INCLUDE, toHandoverView, toMoney } from "./internal";
import type {
  HandoverActor,
  HandoverView,
  RecordHandoverForDateInput,
} from "./types";

/**
 * Noon Nairobi minus `businessDateStartUtc`'s offset — unambiguously
 * inside the business day, clear of both the start and end UTC
 * boundaries `businessDateStartUtc` / `businessDateEndUtc` compute.
 *
 * `businessDateStartUtc(date)` is midnight Nairobi, i.e. **21:00 UTC the
 * previous day** (Africa/Nairobi is a fixed UTC+3). Noon Nairobi is
 * 09:00 UTC on `date` itself, which is 12h after that start instant —
 * NOT 9h (that would land at 06:00 UTC = 09:00 Nairobi, still correct
 * calendar-day-wise but not actually noon).
 */
const NOON_OFFSET_MS = 12 * 60 * 60 * 1000;

/**
 * The Admin back-enters a handover a staff member never declared (ADR-79
 * — client-reported: a Canteen handover was missed and had to go in by
 * hand). Admin-only — enforced at the route AND re-asserted here, since
 * every other Admin-only domain mutation does the same.
 *
 * Differs from `declareHandover` in exactly the ways a back-entry needs:
 *   - the actor is the Admin, not the staff member — `staffId` /
 *     `locationId` are input, not resolved from the acting user, and
 *     must agree with the staff member's own location (a handover is
 *     always for the staff member's own location).
 *   - no `assertStaffDateIsToday` — the whole point is a past day.
 *   - no `assertDayOpen` either: this is deliberately an Admin-only path
 *     (asserted below), and Admin is exactly the role that
 *     `assertActorMayCorrectOnDate`'s closed-day branch already lets
 *     touch a sealed day — so both an open and a closed day are fine
 *     here, with nothing left to gate on once the role check has run.
 *
 * `occurredAt` is pinned to noon Nairobi on `businessDate` rather than
 * "now", so the row lands unambiguously in that business day regardless
 * of when the drawer is actually submitted.
 *
 * A handover writes NO `MoneyMovement` (ADR-53) — a custody record, not
 * revenue — so this back-entry cannot desync any ledger balance.
 *
 * Guards against a duplicate primary row: if an **original** handover
 * (`correctsHandoverId` null) already exists for this staff member on
 * this business day, throws `CONFLICT` — `correctHandover` is the way to
 * adjust it, not a second back-entry.
 */
export async function recordHandoverForDate(
  input: RecordHandoverForDateInput,
  actor: HandoverActor,
): Promise<HandoverView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can back-enter a handover.",
    );
  }

  const cashDeclared = toMoney(input.cashDeclared, "cashDeclared");
  const mpesaDeclared = toMoney(input.mpesaDeclared, "mpesaDeclared");
  const dayStart = businessDateStartUtc(input.businessDate);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const occurredAt = new Date(dayStart.getTime() + NOON_OFFSET_MS);

  const row = await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({
      where: { id: input.staffId },
      select: { id: true, locationId: true },
    });
    if (!staff) {
      throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
    }
    if (staff.locationId !== input.locationId) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This staff member belongs to a different location.",
        "locationId",
      );
    }

    const existing = await tx.handover.findFirst({
      where: {
        staffId: staff.id,
        correctsHandoverId: null,
        occurredAt: { gte: dayStart, lt: dayEnd },
      },
      select: { id: true },
    });
    if (existing) {
      throw new DomainError(
        "CONFLICT",
        `A handover for this staff member on ${input.businessDate} already exists — correct it instead.`,
      );
    }

    const created = await tx.handover.create({
      data: {
        staffId: staff.id,
        locationId: staff.locationId,
        cashDeclared,
        mpesaDeclared,
        occurredAt,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "create",
        entityType: "handover",
        entityId: created.id,
        newValue: {
          cashDeclared: cashDeclared.toFixed(2),
          mpesaDeclared: mpesaDeclared.toFixed(2),
          locationId: staff.locationId,
          backEntry: true,
          recordedByRole: actor.role,
        },
        occurredAt,
      },
    });

    return tx.handover.findUniqueOrThrow({
      where: { id: created.id },
      include: HANDOVER_INCLUDE,
    });
  });

  return toHandoverView(row, row.cashDeclared, row.mpesaDeclared);
}
