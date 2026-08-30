import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import type {
  ActorContext,
  DerivedSaleView,
  ListDerivedSalesFilter,
} from "./types";
import { DomainError } from "./errors";
import { moneyString, quantityString } from "./internal";

/**
 * Per-product derived-sales reads for the canteen (PRD §4.4 — "As the
 * Admin, I can see, per product, when it was last counted and what
 * period a derived sales figure covers").
 *
 * Everything is derived from `StockCount` + `StockMovement` +
 * `MoneyMovement` rows — nothing is stored. For a product's most recent
 * count we join:
 *   - its `sale` `StockMovement` via `stockCountId` → `unitsSold`
 *     (the row's `quantity` is negative; `unitsSold` is its magnitude),
 *   - its `canteen_sale` `MoneyMovement` via `sourceId` → `revenue`
 *     (absent when `sold === 0`, in which case `revenue` is `"0.00"`),
 *   - the previous count's `occurredAt` → `periodStart`.
 *
 * Role scope (mirrors `stock/list-movements.ts`):
 *   - `admin` → every canteen;
 *   - `canteen_attendant` → only their own canteen (`ctx.locationId`);
 *     no `locationId` → `FORBIDDEN`;
 *   - any other role → `FORBIDDEN`.
 */

type CanteenScope = { canteenLocationId?: string };

function resolveScope(ctx: ActorContext): CanteenScope {
  if (ctx.role === "admin") return {};
  if (ctx.role === "canteen_attendant") {
    if (!ctx.locationId) {
      throw new DomainError(
        "FORBIDDEN",
        "Your account is not assigned to a canteen.",
      );
    }
    return { canteenLocationId: ctx.locationId };
  }
  throw new DomainError(
    "FORBIDDEN",
    "You do not have access to canteen derived sales.",
  );
}

/** Build one `DerivedSaleView` for a product from its latest count. */
async function viewForProduct(
  productId: string,
  productName: string,
  canteenLocationId: string,
  countFilter: Prisma.StockCountWhereInput,
): Promise<DerivedSaleView> {
  const counts = await prisma.stockCount.findMany({
    where: { ...countFilter, productId, locationId: canteenLocationId },
    orderBy: { occurredAt: "desc" },
    take: 2,
    select: { id: true, occurredAt: true },
  });

  if (counts.length === 0) {
    return {
      productId,
      productName,
      lastCountedAt: null,
      periodStart: null,
      periodEnd: null,
      unitsSold: null,
      revenue: null,
    };
  }

  const latest = counts[0];
  const prev = counts[1] ?? null;

  const [saleMovement, revenueMovement] = await Promise.all([
    prisma.stockMovement.findFirst({
      where: { stockCountId: latest.id, movementType: "sale" },
      select: { quantity: true },
    }),
    prisma.moneyMovement.findFirst({
      where: { sourceType: "canteen_sale", sourceId: latest.id },
      select: { amount: true },
    }),
  ]);

  const unitsSold = saleMovement
    ? saleMovement.quantity.negated()
    : new Prisma.Decimal(0);
  const revenue = revenueMovement
    ? revenueMovement.amount
    : new Prisma.Decimal(0);

  return {
    productId,
    productName,
    lastCountedAt: latest.occurredAt.toISOString(),
    periodStart: prev ? prev.occurredAt.toISOString() : null,
    periodEnd: latest.occurredAt.toISOString(),
    unitsSold: quantityString(unitsSold),
    revenue: moneyString(revenue),
  };
}

/**
 * One product's most-recent derived-sales figure. `NOT_FOUND` if the
 * product doesn't exist. A canteen product that has never been counted
 * comes back with `null` figures (not an error) so the caller can show
 * the gap.
 */
export async function getDerivedSalesForProduct(
  productId: string,
  ctx: ActorContext,
): Promise<DerivedSaleView> {
  const scope = resolveScope(ctx);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, deletedAt: true },
  });
  if (!product || product.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.", "productId");
  }

  // Which canteen? Admin: infer from the product's active canteen
  // `ProductLocation` (a product is sold at one canteen). Attendant:
  // their own.
  const canteenLocationId =
    scope.canteenLocationId ?? (await resolveProductCanteen(productId));
  if (!canteenLocationId) {
    return {
      productId,
      productName: product.name,
      lastCountedAt: null,
      periodStart: null,
      periodEnd: null,
      unitsSold: null,
      revenue: null,
    };
  }

  return viewForProduct(productId, product.name, canteenLocationId, {});
}

/**
 * All canteen products (or one), newest count first. `date` windows on
 * the latest count's `occurredAt`. A product with no count in scope is
 * still listed with `null` figures.
 */
export async function listDerivedSales(
  filter: ListDerivedSalesFilter,
  ctx: ActorContext,
): Promise<DerivedSaleView[]> {
  const scope = resolveScope(ctx);

  const countFilter: Prisma.StockCountWhereInput = {};
  if (filter.date) {
    countFilter.occurredAt = {
      gte: businessDateStartUtc(filter.date),
      lt: businessDateEndUtc(filter.date),
    };
  }

  // The canteen product set: active `ProductLocation` rows at a canteen
  // (all canteens for admin, the attendant's for a canteen_attendant),
  // optionally narrowed to one product.
  const productLocations = await prisma.productLocation.findMany({
    where: {
      active: true,
      sellingPrice: { not: null },
      ...(scope.canteenLocationId
        ? { locationId: scope.canteenLocationId }
        : { location: { type: "canteen" } }),
      ...(filter.productId ? { productId: filter.productId } : {}),
      product: { deletedAt: null },
    },
    select: {
      productId: true,
      locationId: true,
      product: { select: { name: true } },
    },
    orderBy: { product: { name: "asc" } },
  });

  const views = await Promise.all(
    productLocations.map((pl) =>
      viewForProduct(pl.productId, pl.product.name, pl.locationId, countFilter),
    ),
  );

  // Newest count first; never-counted rows (null `periodEnd`) sort last.
  return views.sort((a, b) => {
    if (a.periodEnd && b.periodEnd) return b.periodEnd.localeCompare(a.periodEnd);
    if (a.periodEnd) return -1;
    if (b.periodEnd) return 1;
    return a.productName.localeCompare(b.productName);
  });
}

/** The canteen a product is sold at, or `null` (admin path, single-product read). */
async function resolveProductCanteen(productId: string): Promise<string | null> {
  const pl = await prisma.productLocation.findFirst({
    where: {
      productId,
      active: true,
      sellingPrice: { not: null },
      location: { type: "canteen" },
    },
    select: { locationId: true },
  });
  return pl?.locationId ?? null;
}
