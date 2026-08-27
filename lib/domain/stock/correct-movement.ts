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
 * A `delta` of zero is a `VALIDATION_ERROR` — nothing to correct.
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

    const delta = corrected.sub(original.quantity);
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
