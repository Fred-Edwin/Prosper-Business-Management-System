import { prisma } from "@/lib/db";
import { businessDateStartUtc } from "@/lib/time";
import { assertDayOpen } from "@/lib/domain/audit";
import type { SetOpeningStockInput, StockMovementView } from "./types";
import { toMagnitude, toMovementView } from "./internal";
import {
  assertKindAllowedAtLocation,
  assertLocationExists,
  assertProductExists,
} from "./guards";

/**
 * Record the opening on-hand quantity for a product/location on a business
 * date (ADR-11 — opening stock is a ledger row, not a pre-written job
 * output).
 *
 * The row is an `opening`-type `StockMovement` at
 * `businessDateStartUtc(businessDate)`, with `quantity` signed to move the
 * derived balance *to* the stated figure:
 *
 *   - No prior `opening` row for the date  → write `quantity = stated`
 *     (a fresh opening; the derived balance for the day starts here).
 *   - A prior `opening` row exists          → this is a **correction** of
 *     it (ADR-15): write a second `opening` row with
 *     `correctsMovementId` set and `quantity = stated − sum(prior opening
 *     rows)`, so the summed opening equals the newly stated figure. Never
 *     a `CONFLICT`, never a mutation of the original.
 *
 * `quantity` in is an unsigned magnitude (opening stock is never negative).
 */
export async function setOpeningStock(
  input: SetOpeningStockInput,
): Promise<StockMovementView> {
  const stated = toMagnitude(input.quantity);
  const occurredAt = businessDateStartUtc(input.businessDate);

  const row = await prisma.$transaction(async (tx) => {
    // Day-close gate (ADR-52) — opening stock is the day's boundary
    // figure; once the date is sealed it can only change by reopening it.
    await assertDayOpen(input.businessDate, tx);
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);
    // R1 (ADR-67): ingredient ⇒ Store; dish/goods ⇒ Restaurant/Canteen.
    await assertKindAllowedAtLocation(tx, input.productId, input.locationId);

    const priorOpenings = await tx.stockMovement.findMany({
      where: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "opening",
        occurredAt,
      },
      orderBy: { createdAt: "asc" },
    });

    if (priorOpenings.length === 0) {
      return tx.stockMovement.create({
        data: {
          productId: input.productId,
          locationId: input.locationId,
          movementType: "opening",
          quantity: stated,
          recordedById: input.recordedById,
          occurredAt,
        },
      });
    }

    // Correction: the first row is the original; the delta makes the
    // summed opening equal `stated`.
    const currentOpening = priorOpenings.reduce(
      (sum, r) => sum.add(r.quantity),
      stated.mul(0),
    );
    const delta = stated.sub(currentOpening);

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "opening",
        quantity: delta,
        recordedById: input.recordedById,
        occurredAt,
        correctsMovementId: priorOpenings[0].id,
        note: "Opening stock adjustment",
      },
    });
  });

  return toMovementView(row);
}
