import { prisma } from "@/lib/db";
import { assertDayOpen, assertStaffDateIsToday } from "@/lib/domain/audit";
import { DomainError } from "./errors";
import { HANDOVER_INCLUDE, toHandoverView, toMoney } from "./internal";
import { resolveActingStaff } from "./resolve-staff";
import type { DeclareHandoverInput, HandoverActor, HandoverView } from "./types";

/**
 * A Cashier or Canteen Attendant declares the day's takings they are
 * handing to the Admin (PRD §4.5). One `Handover` row per call — the
 * staff member and location come from the acting user's `Staff` link
 * (they can only ever declare for their own location).
 *
 * This is a **create** path, so it is day-close gated (ADR-52): a
 * declaration dated to a sealed business day is rejected — an Admin
 * correction is the only way in after close.
 *
 * `occurredAt` defaults to now; its Africa/Nairobi business day is what
 * the gate checks and what `listHandovers` / the reconciliation read
 * bucket by.
 *
 * No correction is written here — `correctHandover` (Admin-only,
 * append-only) is the post-hoc path.
 */
export async function declareHandover(
  input: DeclareHandoverInput,
  actor: HandoverActor,
): Promise<HandoverView> {
  const cashDeclared = toMoney(input.cashDeclared, "cashDeclared");
  const mpesaDeclared = toMoney(input.mpesaDeclared, "mpesaDeclared");
  const occurredAt = input.occurredAt ?? new Date();

  const row = await prisma.$transaction(async (tx) => {
    const { staffId, locationId } = await resolveActingStaff(actor.userId, tx);

    // Staff may only record for today (ADR-53), AND the day must be open
    // (ADR-52) — both gates, not one or the other. Admin is exempt from
    // the today rule but still bound by day-close.
    assertStaffDateIsToday(occurredAt, actor);
    await assertDayOpen(occurredAt, tx);

    const created = await tx.handover.create({
      data: {
        staffId,
        locationId,
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
          locationId,
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
