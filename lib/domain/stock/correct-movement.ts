import { prisma } from "@/lib/db";
import type { ActorContext } from "./types";
import type { CorrectMovementInput, StockMovementView } from "./types";
import { toQuantity, toMovementView } from "./internal";
import { DomainError } from "./errors";
import { assertActorMayCorrectOnDate } from "@/lib/domain/audit";

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
 *
 * **Transfers move both legs (ADR-94).** A transfer is two rows — the
 * sender's `-q` dispatch and the receiver's `+q` receipt, the receipt
 * linked to the dispatch by `correctsMovementId` (ADR-39). Correcting
 * either leg writes the delta on that leg AND the opposite delta on the
 * other leg (when it exists — a still-pending dispatch has none), so the
 * pair keeps netting to zero across the two locations. A receipt leg is an
 * original here even though `correctsMovementId` is set: that link points
 * at a row at ANOTHER location, which a correction delta never does.
 * "Current value" only sums deltas at the target's own location — before
 * this, a dispatch's current value wrongly included the receiver's `+q`,
 * so correcting an accepted -95 dispatch to -67 wrote a -67 delta instead
 * of +28 (client report 2026-09-29). A transfer correction must keep the
 * leg's sign (zero allowed): typing "67" on a Transfer Out would otherwise
 * turn the sender into a receiver. Any transfer `variance` row (short
 * accept, F6) is left as is — the Admin corrects it separately.
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

    // The other leg of a transfer, if any (ADR-94). For a receipt leg it is
    // the dispatch its `correctsMovementId` points at (another location);
    // for a dispatch it is the receipt pointing back at it from the
    // destination. `null` for every other movement type.
    const linked =
      original.movementType === "transfer" && original.correctsMovementId
        ? await tx.stockMovement.findUnique({
            where: { id: original.correctsMovementId },
          })
        : null;
    const isReceiptLeg =
      linked !== null && linked.locationId !== original.locationId;

    // Corrections don't chain — the target must be an original row, never a
    // delta written by an earlier `correctMovement` (Session 17 F-1).
    if (original.correctsMovementId !== null && !isReceiptLeg) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This row is itself a correction. Correct the original movement instead.",
        "movementId",
      );
    }

    // A `sale` row is never restated here (ADR-92): this path writes stock
    // only, so revenue would never follow. Orders, stock counts and credit
    // sales have their own corrections; the Admin's ledger "Sold" edit goes
    // through `adjustSold`, which moves stock and revenue together.
    if (original.movementType === "sale") {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Sales can't be corrected as a plain stock movement. Use the Sold adjustment so revenue updates too.",
        "movementId",
      );
    }

    // Day-close gate — the ONE shared implementation (ADR-52). Closed day
    // → admin only; open day → admin or the original recorder.
    await assertActorMayCorrectOnDate(
      original.occurredAt,
      actor,
      original.recordedById,
      tx,
    );

    // Measure against the *current derived value* of this movement — the
    // original plus every correction delta already applied to it — so a
    // repeated identical correction is a no-op (delta 0) and is rejected,
    // rather than stacking another delta and moving the balance again.
    // Same location only: a transfer receipt also points at its dispatch
    // via `correctsMovementId` but is NOT a delta on it (ADR-94).
    const priorDeltas = await tx.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { correctsMovementId: original.id, locationId: original.locationId },
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

    if (original.movementType === "transfer") {
      const leg = original.quantity.isNegative() ? -1 : 1;
      if (!corrected.isZero() && (corrected.isNegative() ? -1 : 1) !== leg) {
        throw new DomainError(
          "VALIDATION_ERROR",
          leg < 0
            ? "A transfer out stays negative — enter the amount with a minus sign (e.g. -67)."
            : "A transfer in stays positive — enter the amount without a minus sign.",
          "correctedQuantity",
        );
      }
    }

    // The opposite leg of the transfer, which moves by the opposite delta.
    const otherLeg = isReceiptLeg
      ? linked
      : original.movementType === "transfer" &&
          original.correctsMovementId === null &&
          original.transferCounterpartLocationId
        ? await tx.stockMovement.findFirst({
            where: {
              movementType: "transfer",
              correctsMovementId: original.id,
              locationId: original.transferCounterpartLocationId,
            },
          })
        : null;

    if (otherLeg) {
      // The other leg may sit on a different business day (accepted the
      // next morning) — that day's close gates this write too.
      await assertActorMayCorrectOnDate(
        otherLeg.occurredAt,
        actor,
        original.recordedById,
        tx,
      );
      await tx.stockMovement.create({
        data: {
          productId: otherLeg.productId,
          locationId: otherLeg.locationId,
          movementType: "transfer",
          quantity: delta.negated(),
          recordedById: input.recordedById,
          occurredAt: otherLeg.occurredAt,
          transferCounterpartLocationId: otherLeg.transferCounterpartLocationId,
          correctsMovementId: otherLeg.id,
          note: input.note?.trim() || otherLeg.note,
        },
      });
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
