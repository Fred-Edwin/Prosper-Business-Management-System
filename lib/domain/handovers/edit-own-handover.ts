import { prisma } from "@/lib/db";
import { isDayClosed, assertStaffDateIsToday } from "@/lib/domain/audit";
import { DomainError } from "./errors";
import { HANDOVER_INCLUDE, toHandoverView, toMoney } from "./internal";
import { resolveActingStaff } from "./resolve-staff";
import type {
  EditOwnHandoverInput,
  HandoverActor,
  HandoverView,
} from "./types";

/**
 * A staff member's **true edit** of their own declaration before the day
 * is closed (PRD §4.5 — "Before close, staff can edit their own same-day
 * entries"). Not a correction row — while the day is open the figures are
 * simply rewritten; history-preservation (`correctHandover`, Admin-only)
 * takes over once the day rolls.
 *
 *   - `NOT_FOUND` if the handover is missing.
 *   - `FORBIDDEN` if it belongs to another staff member.
 *   - `FORBIDDEN` ("closed") if its business day is sealed — real
 *     `DayClose` lookup (ADR-52), like `editOwnOrder`.
 *   - `VALIDATION_ERROR` if the target is itself a correction row.
 *   - `CONFLICT` if a receipt already exists — once the Admin has
 *     recorded receipt, the declared figure is locked in a stored
 *     variance and only an Admin correction may move it.
 *
 * `occurredAt` is not touched — an edit stays in the same business day.
 */
export async function editOwnHandover(
  handoverId: string,
  input: EditOwnHandoverInput,
  actor: HandoverActor,
): Promise<HandoverView> {
  const cashDeclared = toMoney(input.cashDeclared, "cashDeclared");
  const mpesaDeclared = toMoney(input.mpesaDeclared, "mpesaDeclared");

  const row = await prisma.$transaction(async (tx) => {
    const handover = await tx.handover.findUnique({
      where: { id: handoverId },
      select: {
        id: true,
        staffId: true,
        occurredAt: true,
        correctsHandoverId: true,
        cashDeclared: true,
        mpesaDeclared: true,
        _count: { select: { receipts: true } },
      },
    });
    if (!handover) {
      throw new DomainError("NOT_FOUND", "Handover not found.", "handoverId");
    }

    const { staffId } = await resolveActingStaff(actor.userId, tx);
    if (handover.staffId !== staffId) {
      throw new DomainError(
        "FORBIDDEN",
        "You can only edit your own handover.",
      );
    }

    // Staff edit their own entry only on today's date (ADR-53) and only
    // while the day is open (ADR-52).
    assertStaffDateIsToday(handover.occurredAt, actor);
    if (await isDayClosed(handover.occurredAt, tx)) {
      throw new DomainError(
        "FORBIDDEN",
        "This day is closed — ask an administrator to correct it.",
      );
    }

    if (handover.correctsHandoverId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This handover is itself a correction. Correct the original instead.",
        "handoverId",
      );
    }

    if (handover._count.receipts > 0) {
      throw new DomainError(
        "CONFLICT",
        "Receipt already recorded — ask an administrator to correct this handover.",
      );
    }

    const preEdit = {
      cashDeclared: handover.cashDeclared.toFixed(2),
      mpesaDeclared: handover.mpesaDeclared.toFixed(2),
    };

    await tx.handover.update({
      where: { id: handover.id },
      data: { cashDeclared, mpesaDeclared },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "correct",
        entityType: "handover",
        entityId: handover.id,
        oldValue: preEdit,
        newValue: {
          cashDeclared: cashDeclared.toFixed(2),
          mpesaDeclared: mpesaDeclared.toFixed(2),
        },
        occurredAt: handover.occurredAt,
      },
    });

    return tx.handover.findUniqueOrThrow({
      where: { id: handover.id },
      include: HANDOVER_INCLUDE,
    });
  });

  return toHandoverView(row, row.cashDeclared, row.mpesaDeclared);
}
