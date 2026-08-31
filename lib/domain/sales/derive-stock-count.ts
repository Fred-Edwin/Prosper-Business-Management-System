import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { DomainError } from "./errors";
import { ZERO } from "./internal";
import {
  assertCanteenLocation,
  resolveCanteenSellingPrice,
} from "./canteen-guards";

/**
 * The ONE canteen derived-sale calculation (M2-F3, ADR-16 / §3.5).
 *
 *   sold = opening + received (transfers + production)
 *          − non-sale consumption − counted remaining
 *
 * expressed as the signed running balance of every `StockMovement` for
 * `(product, canteen)` up to the count instant, minus what was counted:
 *
 *   sold = expectedRemaining − countedQuantity
 *
 * Both `recordStockCount` (which then persists) and `previewStockCount`
 * (which persists nothing) call this — a divergence between the preview
 * the attendant sees and the figure that commits is exactly the class of
 * bug this shared function exists to prevent.
 *
 * It validates (product exists & sold at the canteen; the canteen
 * `Location` is real; no later count already exists) and throws a
 * `DomainError` for those. It does **NOT** throw when the shelf holds
 * more than the ledger expects (`sold < 0`) — it returns
 * `exceedsExpectedBy` and lets the caller decide (record → reject;
 * preview → surface a blocked state without a write).
 *
 * `client` is a `Prisma.TransactionClient` (inside `recordStockCount`'s
 * transaction, so a concurrent count can't pass a stale read) or the
 * bare `prisma` client (the preview read path). Both expose the query
 * methods used here.
 */

export type DeriveStockCountArgs = {
  productId: string;
  /** The canteen the count is taken at. */
  locationId: string;
  /** Already parsed to a non-negative `Decimal` by the caller. */
  countedQuantity: Prisma.Decimal;
  /** The count instant. Must be strictly after the product's previous count. */
  occurredAt: Date;
};

export type StockCountDerivation = {
  productName: string;
  /** Canteen selling price, snapshotted for the revenue calc. */
  sellingPrice: Prisma.Decimal;
  /** Previous count's `occurredAt`, or `null` for a first-ever count. */
  periodStart: Date | null;
  /** Alias of `periodStart` — the "last counted at" for the view / copy. */
  lastCountedAt: Date | null;
  /** Whole days between the previous count and this one; `null` if first. */
  daysSincePrevious: number | null;
  isFirstCount: boolean;
  /** Signed Σ of every StockMovement for (product, canteen) up to the count. */
  expectedRemaining: Prisma.Decimal;
  countedQuantity: Prisma.Decimal;
  /** `expectedRemaining − countedQuantity`. May be negative (see `exceedsExpectedBy`). */
  unitsSold: Prisma.Decimal;
  /** `max(unitsSold, 0) × sellingPrice`, 2dp. Zero when nothing sold or over-count. */
  revenue: Prisma.Decimal;
  /** Closing stock the count will set — always the counted value. */
  closingStockWillBe: Prisma.Decimal;
  /**
   * `null` when the count is valid; a positive `Decimal` = how far the
   * counted quantity exceeds what the ledger accounts for (i.e. `−sold`).
   * When set, `recordStockCount` rejects and the preview shows the
   * blocked state.
   */
  exceedsExpectedBy: Prisma.Decimal | null;
  occurredAt: Date;
};

type DeriveClient = Prisma.TransactionClient | PrismaClient;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function deriveStockCount(
  client: DeriveClient,
  args: DeriveStockCountArgs,
): Promise<StockCountDerivation> {
  const { productId, locationId, countedQuantity, occurredAt } = args;

  const product = await client.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, deletedAt: true },
  });
  if (!product || product.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.", "productId");
  }

  await assertCanteenLocation(client, locationId);

  const sellingPrice = await resolveCanteenSellingPrice(
    client,
    productId,
    locationId,
    product.name,
  );

  // Previous count for this product at this canteen bounds the period.
  const prev = await client.stockCount.findFirst({
    where: { productId, locationId, occurredAt: { lt: occurredAt } },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });

  // A later (or same-instant) count already exists → this count can't
  // define a forward period.
  const laterCount = await client.stockCount.findFirst({
    where: { productId, locationId, occurredAt: { gte: occurredAt } },
    select: { id: true },
  });
  if (laterCount) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "A later count already exists for this product — counts must move forward in time.",
      "occurredAt",
    );
  }

  const agg = await client.stockMovement.aggregate({
    _sum: { quantity: true },
    where: { productId, locationId, occurredAt: { lte: occurredAt } },
  });
  const expectedRemaining = agg._sum.quantity ?? ZERO;
  const unitsSold = expectedRemaining.sub(countedQuantity);

  const exceedsExpectedBy = unitsSold.isNegative() ? unitsSold.abs() : null;

  const soldForRevenue = unitsSold.isNegative() ? ZERO : unitsSold;
  const revenue = soldForRevenue.mul(sellingPrice).toDecimalPlaces(2);

  const daysSincePrevious = prev
    ? Math.max(
        0,
        Math.round(
          (occurredAt.getTime() - prev.occurredAt.getTime()) / MS_PER_DAY,
        ),
      )
    : null;

  return {
    productName: product.name,
    sellingPrice,
    periodStart: prev ? prev.occurredAt : null,
    lastCountedAt: prev ? prev.occurredAt : null,
    daysSincePrevious,
    isFirstCount: prev === null,
    expectedRemaining,
    countedQuantity,
    unitsSold,
    revenue,
    closingStockWillBe: countedQuantity,
    exceedsExpectedBy,
    occurredAt,
  };
}

/** Parse a submitted counted-remaining value to a non-negative `Decimal`. */
export function parseCountedQuantity(value: string): Prisma.Decimal {
  let counted: Prisma.Decimal;
  try {
    counted = new Prisma.Decimal(value);
  } catch {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Counted quantity must be a number.",
      "countedQuantity",
    );
  }
  if (!counted.isFinite() || counted.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Counted quantity must be zero or more.",
      "countedQuantity",
    );
  }
  return counted;
}

/** The `VALIDATION_ERROR` thrown when the shelf holds more than expected. */
export function overCountError(exceedsExpectedBy: Prisma.Decimal): DomainError {
  return new DomainError(
    "VALIDATION_ERROR",
    `Counted quantity exceeds expected stock by ${exceedsExpectedBy.toFixed(
      4,
    )} — record the missing receipt or transfer first, then recount.`,
    "countedQuantity",
  );
}
