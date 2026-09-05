import { prisma } from "@/lib/db";
import { businessDateStartUtc } from "@/lib/time";
import { assertDayOpen, resolveOpeningDay } from "@/lib/domain/audit";
import type { SetOpeningStockInput, StockMovementView } from "./types";
import { toMagnitude, toMovementView } from "./internal";
import {
  assertKindAllowedAtLocation,
  assertLocationExists,
  assertProductExists,
} from "./guards";

/**
 * Record the opening on-hand quantity for a product/location (ADR-11 —
 * opening stock is a ledger row, not a pre-written job output).
 *
 * **The business date is pinned server-side** (`resolveOpeningDay`,
 * ADR-70); `input.businessDate` is ignored where supplied. There is
 * exactly ONE opening position per product/location for the life of the
 * business — the day tracking began — not one per day.
 *
 * Before ADR-70 the screen sent `today` on every save, so entering counts
 * on a later date wrote a SECOND opening dated to that day rather than
 * correcting Day 1. Both rows then counted, and because an `opening` row
 * feeds the opening term of every period that can see it (see the long
 * note in `get-financial-summary.ts`), the stock appeared from nowhere and
 * dragged COGS negative — tens of thousands of phantom profit. Pinning the
 * date makes that unwritable rather than merely discouraged.
 *
 * The row is an `opening`-type `StockMovement` at
 * `businessDateStartUtc(<pinned day>)`, with `quantity` signed to move the
 * derived balance *to* the stated figure:
 *
 *   - No prior `opening` row for the pair → write `quantity = stated`
 *     (a fresh opening; the derived balance starts here).
 *   - A prior `opening` row exists        → this is a **correction** of
 *     it (ADR-15): write a second `opening` row with
 *     `correctsMovementId` set and `quantity = stated − sum(prior opening
 *     rows)`, so the summed opening equals the newly stated figure. Never
 *     a `CONFLICT`, never a mutation of the original, and every movement
 *     recorded since is untouched — they are independent rows that were
 *     never derived from this one.
 *
 * The prior-opening lookup is scoped to the product/location pair and
 * deliberately NOT to a date: with the day pinned, any existing opening
 * for the pair is by definition the one being corrected. Scoping it by
 * date (as it was pre-ADR-70) is what let a later entry miss the original
 * and write a duplicate.
 *
 * `quantity` in is an unsigned magnitude (opening stock is never negative).
 */
export async function setOpeningStock(
  input: SetOpeningStockInput,
): Promise<StockMovementView> {
  const stated = toMagnitude(input.quantity);

  const row = await prisma.$transaction(async (tx) => {
    const businessDate = await resolveOpeningDay(tx);
    const occurredAt = businessDateStartUtc(businessDate);

    // Day-close gate (ADR-52) — opening stock is the day's boundary
    // figure; once the date is sealed it can only change by reopening it.
    await assertDayOpen(businessDate, tx);
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);
    // R1 (ADR-67): ingredient ⇒ Store; dish/goods ⇒ Restaurant/Canteen.
    await assertKindAllowedAtLocation(tx, input.productId, input.locationId);

    const priorOpenings = await tx.stockMovement.findMany({
      where: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "opening",
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
