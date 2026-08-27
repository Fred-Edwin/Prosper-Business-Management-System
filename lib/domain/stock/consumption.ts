import { prisma } from "@/lib/db";
import type { RecordNonSaleConsumptionInput, StockMovementView } from "./types";
import { toMagnitude, toMovementView } from "./internal";
import { DomainError } from "./errors";
import { assertLocationExists, assertProductExists } from "./guards";

/**
 * Record non-sale consumption of stock (any relevant staff member,
 * location-scoped at the route). Single `-quantity` `non_sale_consumption`
 * row at `locationId`.
 *
 * `reason` is required (Zod guarantees the enum); `reasonNote` is required
 * **iff** `reason === "other"` → else `VALIDATION_ERROR` on `reasonNote`
 * (PRD §4.2, SCHEMA §3).
 */
export async function recordNonSaleConsumption(
  input: RecordNonSaleConsumptionInput,
): Promise<StockMovementView> {
  const qty = toMagnitude(input.quantity);

  const note = input.reasonNote?.trim() ?? "";
  if (input.reason === "other" && note.length === 0) {
    throw new DomainError(
      "VALIDATION_ERROR",
      'A note is required when the reason is "Other".',
      "reasonNote",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "non_sale_consumption",
        quantity: qty.negated(),
        recordedById: input.recordedById,
        occurredAt: new Date(),
        reason: input.reason,
        reasonNote: input.reason === "other" ? note : null,
      },
    });
  });

  return toMovementView(row);
}
