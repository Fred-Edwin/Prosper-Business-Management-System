import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";

type Tx = Prisma.TransactionClient;

/**
 * Guards for the canteen derived-sales slice (S5). Mirrors
 * `lib/domain/stock/guards.ts` — small `assert*` helpers that throw a
 * `DomainError` and are called at the top of a domain transaction.
 */

/** Throw unless `locationId` is an existing `canteen` `Location`. */
export async function assertCanteenLocation(
  tx: Tx,
  locationId: string,
): Promise<void> {
  const l = await tx.location.findUnique({
    where: { id: locationId },
    select: { id: true, type: true },
  });
  if (!l) {
    throw new DomainError("NOT_FOUND", "Canteen location not found.", "locationId");
  }
  if (l.type !== "canteen") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This operation is only valid at a canteen location.",
      "locationId",
    );
  }
}

/**
 * The canteen selling price for a product, snapshotted for the revenue
 * calc. Requires an **active** `ProductLocation` at the canteen with a
 * **non-null** `sellingPrice` — otherwise the product "is not sold at the
 * canteen" (`VALIDATION_ERROR`).
 */
export async function resolveCanteenSellingPrice(
  tx: Tx,
  productId: string,
  locationId: string,
  productName: string,
): Promise<Prisma.Decimal> {
  const pl = await tx.productLocation.findUnique({
    where: { productId_locationId: { productId, locationId } },
    select: { sellingPrice: true, active: true },
  });
  if (!pl || !pl.active || pl.sellingPrice == null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `${productName} is not sold at the canteen.`,
      "productId",
    );
  }
  return pl.sellingPrice;
}
