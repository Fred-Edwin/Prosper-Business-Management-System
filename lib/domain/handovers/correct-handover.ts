import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import {
  HANDOVER_INCLUDE,
  deriveDeclared,
  toHandoverView,
  toMoney,
} from "./internal";
import type {
  CorrectHandoverInput,
  HandoverActor,
  HandoverView,
} from "./types";

/**
 * Correct a handover's declared figures (ADR-15 / CONVENTIONS §4, shaped
 * after `lib/domain/stock/correct-movement.ts`).
 *
 * The input is the **corrected final declared** cash + M-Pesa. The domain:
 *   1. loads the original `Handover` (never mutated);
 *   2. computes each channel's delta against the **current derived value**
 *      (`original + Σ every existing correction delta`), so re-submitting
 *      the same corrected figures is `delta 0` on both channels and is
 *      rejected — never stacks a second identical delta row (M1 F-1);
 *   3. writes **one new `Handover`** with `correctsHandoverId = original.id`,
 *      `cashDeclared` / `mpesaDeclared` = the signed deltas, same
 *      `staffId` / `locationId` / `occurredAt` (so the correction lands in
 *      the same business day as what it corrects).
 *
 * **Not day-close gated** — a correction must work on a sealed day; the
 * route enforces Admin-only.
 *
 * The target must be an **original** row: a correction row
 * (`correctsHandoverId` set) cannot itself be corrected — corrections
 * don't chain. Correct the original again.
 */
export async function correctHandover(
  input: CorrectHandoverInput,
  actor: HandoverActor,
): Promise<HandoverView> {
  const correctedCash = toMoney(input.cashDeclared, "cashDeclared");
  const correctedMpesa = toMoney(input.mpesaDeclared, "mpesaDeclared");

  const originalId = await prisma.$transaction(async (tx) => {
    const original = await tx.handover.findUnique({
      where: { id: input.handoverId },
      select: {
        id: true,
        staffId: true,
        locationId: true,
        occurredAt: true,
        correctsHandoverId: true,
      },
    });
    if (!original) {
      throw new DomainError("NOT_FOUND", "Handover not found.", "handoverId");
    }
    if (original.correctsHandoverId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This handover is itself a correction. Correct the original instead.",
        "handoverId",
      );
    }

    const current = await deriveDeclared(tx, original.id);
    if (!current) {
      throw new DomainError("NOT_FOUND", "Handover not found.", "handoverId");
    }

    const cashDelta = correctedCash.sub(current.cash);
    const mpesaDelta = correctedMpesa.sub(current.mpesa);
    if (cashDelta.isZero() && mpesaDelta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected figures are the same as the current ones.",
        "cashDeclared",
      );
    }

    const correction = await tx.handover.create({
      data: {
        staffId: original.staffId,
        locationId: original.locationId,
        cashDeclared: cashDelta,
        mpesaDeclared: mpesaDelta,
        occurredAt: original.occurredAt,
        correctsHandoverId: original.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "correct",
        entityType: "handover",
        entityId: original.id,
        newValue: {
          correctionId: correction.id,
          cashDeclaredTo: correctedCash.toFixed(2),
          mpesaDeclaredTo: correctedMpesa.toFixed(2),
          cashDelta: cashDelta.toFixed(2),
          mpesaDelta: mpesaDelta.toFixed(2),
        },
        occurredAt: original.occurredAt,
      },
    });

    return original.id;
  });

  const row = await prisma.handover.findUniqueOrThrow({
    where: { id: originalId },
    include: HANDOVER_INCLUDE,
  });
  const derived = await deriveDeclared(prisma, originalId);
  return toHandoverView(
    row,
    derived?.cash ?? row.cashDeclared,
    derived?.mpesa ?? row.mpesaDeclared,
  );
}
