import { prisma } from "@/lib/db";
import type { ActorContext } from "./types";
import type { CorrectMovementInput, StockMovementView } from "./types";
import { toQuantity, toMovementView } from "./internal";
import { DomainError } from "./errors";
import { toBusinessDate, businessDateOnly } from "@/lib/time";

/**
 * Correct a stock movement (ADR-15 / CONVENTIONS §4).
 *
 * The input is the **corrected final quantity** of the target row (signed,
 * from the target's location perspective). The domain:
 *
 *   1. loads the original row (never mutated),
 *   2. computes `delta = correctedQuantity − original.quantity`,
 *   3. writes a **new `StockMovement`** of the *same* `movementType`, same
 *      product/location, `quantity = delta`, `correctsMovementId =
 *      original.id`, `note` carried, `occurredAt` = the original's (so the
 *      correction lands in the same business day as what it corrects).
 *
 * Day-close gating (CONVENTIONS §4.6, adapted per the Session 6 handoff —
 * corrections are always a delta row, even open-day; who may write one is
 * what the gate controls):
 *   - If a `DayClose` exists for `toBusinessDate(original.occurredAt)` →
 *     **only `admin`** may correct (`FORBIDDEN` otherwise).
 *   - If the day is still open → `admin` **or the original recorder** may
 *     correct (`FORBIDDEN` for any other actor).
 *
 * `delta` is measured against the target's **current derived value**
 * (`original.quantity` + every existing correction delta for it), not the
 * bare original — so re-submitting the same `correctedQuantity` (a retry, a
 * double-click) computes `delta = 0` and is rejected rather than stacking a
 * second identical delta row and moving the balance twice (Session 17 F-1).
 * A `delta` of zero is a `VALIDATION_ERROR` — nothing to correct.
 *
 * The target must be an **original** row: a correction delta (one whose
 * `correctsMovementId` is set) cannot itself be corrected — corrections
 * don't chain. Correct the original again instead.
 */
export async function correctMovement(
  input: CorrectMovementInput,
  actor: ActorContext,
): Promise<StockMovementView> {
  const corrected = toQuantity(input.correctedQuantity, "correctedQuantity");

  const row = await prisma.$transaction(async (tx) => {
    const original = await tx.stockMovement.findUnique({
      where: { id: input.movementId },
    });
    if (!original) {
      throw new DomainError("NOT_FOUND", "Movement not found.", "movementId");
    }

    // Corrections don't chain — the target must be an original row, never a
    // delta written by an earlier `correctMovement` (Session 17 F-1).
    if (original.correctsMovementId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This row is itself a correction. Correct the original movement instead.",
        "movementId",
      );
    }

    const businessDate = toBusinessDate(original.occurredAt);
    const dayClose = await tx.dayClose.findUnique({
      where: { date: businessDateOnly(businessDate) },
      select: { id: true },
    });

    const isAdmin = actor.role === "admin";
    const isOriginalRecorder = actor.userId === original.recordedById;

    if (dayClose) {
      if (!isAdmin) {
        throw new DomainError(
          "FORBIDDEN",
          "This day is closed — only an administrator can correct it.",
        );
      }
    } else if (!isAdmin && !isOriginalRecorder) {
      throw new DomainError(
        "FORBIDDEN",
        "Only the person who recorded this movement, or an administrator, can correct it.",
      );
    }

    // Measure against the *current derived value* of this movement — the
    // original plus every correction delta already applied to it — so a
    // repeated identical correction is a no-op (delta 0) and is rejected,
    // rather than stacking another delta and moving the balance again.
    const priorDeltas = await tx.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { correctsMovementId: original.id },
    });
    const currentValue = original.quantity.add(
      priorDeltas._sum.quantity ?? 0,
    );

    const delta = corrected.sub(currentValue);
    if (delta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected quantity is the same as the current one.",
        "correctedQuantity",
      );
    }

    return tx.stockMovement.create({
      data: {
        productId: original.productId,
        locationId: original.locationId,
        movementType: original.movementType,
        quantity: delta,
        recordedById: input.recordedById,
        occurredAt: original.occurredAt,
        reason: original.reason,
        reasonNote: original.reasonNote,
        transferCounterpartLocationId: original.transferCounterpartLocationId,
        purchasePaymentId: original.purchasePaymentId,
        correctsMovementId: original.id,
        note: input.note?.trim() || original.note,
      },
    });
  });

  return toMovementView(row);
}
