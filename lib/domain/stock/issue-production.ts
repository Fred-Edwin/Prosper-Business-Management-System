import { prisma } from "@/lib/db";
import type {
  RecordKitchenIssueInput,
  RecordProductionInput,
  StockMovementView,
} from "./types";
import { toMagnitude, toMovementView } from "./internal";
import {
  assertLocationExists,
  assertLocationOfType,
  assertProductExists,
  assertProductIsDish,
} from "./guards";

/**
 * Record a kitchen issue — stock taken from the Store for cooking (Store
 * Manager only, enforced at the route). Store → cooking; the counterpart
 * is "cooking", not another stock location, so this is a single
 * `-quantity` `issue` row at the Store `locationId`.
 */
export async function recordKitchenIssue(
  input: RecordKitchenIssueInput,
): Promise<StockMovementView> {
  const qty = toMagnitude(input.quantity);

  const row = await prisma.$transaction(async (tx) => {
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "issue",
        quantity: qty.negated(),
        recordedById: input.recordedById,
        occurredAt: new Date(),
      },
    });
  });

  return toMovementView(row);
}

/**
 * Record production — a quantity of a Dish produced, added to Restaurant
 * stock (Store Manager only, enforced at the route). Single `+quantity`
 * `production` row at the Restaurant `locationId`. Guard: the product must
 * be `kind = "dish"`.
 */
export async function recordProduction(
  input: RecordProductionInput,
): Promise<StockMovementView> {
  const qty = toMagnitude(input.quantity);

  const row = await prisma.$transaction(async (tx) => {
    await assertProductIsDish(tx, input.productId);
    await assertLocationOfType(tx, input.locationId, "restaurant");

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "production",
        quantity: qty,
        recordedById: input.recordedById,
        occurredAt: new Date(),
      },
    });
  });

  return toMovementView(row);
}
