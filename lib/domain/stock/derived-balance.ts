import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { DerivedBalance, GetDerivedBalanceInput } from "./types";
import { quantityString } from "./internal";

/**
 * The one read everything in M1 calls for "how much of X is at location Y".
 *
 * **Ledger, not stored total** (CLAUDE.md / ADR-14): a plain signed sum of
 * every `StockMovement.quantity` for the product+location, up to `asOf`
 * (default: now, on `occurredAt`). There is no balance column.
 *
 * Corrections need no special handling: `correctMovement` writes the delta
 * as its own signed `quantity` row (ADR-15 / ADR-39), so summing every row
 * — originals and correction deltas alike — yields the current figure with
 * no double-count and no omission.
 */
export async function getDerivedStockBalance(
  input: GetDerivedBalanceInput,
): Promise<DerivedBalance> {
  const asOf = input.asOf ?? new Date();

  const agg = await prisma.stockMovement.aggregate({
    _sum: { quantity: true },
    where: {
      productId: input.productId,
      locationId: input.locationId,
      occurredAt: { lte: asOf },
    },
  });

  return {
    productId: input.productId,
    locationId: input.locationId,
    quantity: quantityString(agg._sum.quantity ?? new Prisma.Decimal(0)),
  };
}

/**
 * Batched variant so the Sessions 7–8 stock-levels screens don't N+1:
 * one grouped query for many products at a single location.
 * `asOf` defaults to now. Products with no rows come back as `"0.0000"`.
 */
export async function getDerivedStockBalances(
  productIds: string[],
  locationId: string,
  asOf?: Date,
): Promise<DerivedBalance[]> {
  if (productIds.length === 0) return [];
  const at = asOf ?? new Date();

  const grouped = await prisma.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: {
      productId: { in: productIds },
      locationId,
      occurredAt: { lte: at },
    },
  });

  const byProduct = new Map(
    grouped.map((g) => [g.productId, g._sum.quantity ?? new Prisma.Decimal(0)]),
  );

  return productIds.map((productId) => ({
    productId,
    locationId,
    quantity: quantityString(byProduct.get(productId) ?? new Prisma.Decimal(0)),
  }));
}
