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
 * Everything is derived from `StockCount` + `StockMovement` + `Debt` +
 * `MoneyMovement` rows — nothing is stored. For a product's most recent
 * count's period `(prev.occurredAt, latest.occurredAt]` we fold TWO
 * sources into `unitsSold`/`revenue` (ADR-91):
 *   - the count-derived cash sale: its `sale` `StockMovement` via
 *     `stockCountId` (the row's `quantity` is negative; magnitude is
 *     units sold) and its `canteen_sale` `MoneyMovement` via `sourceId`
 *     (revenue collected in cash);
 *   - any discrete canteen credit sales in the same period: `sale`
 *     `StockMovement` rows with `customerId` set and NO `stockCountId`
 *     (this is what tells the two apart), summed (a plain sum nets out
 *     any corrections/voids since those are signed rows too) — their
 *     revenue isn't a `MoneyMovement` (nothing paid yet, it's owed), so
 *     it's read from the linked `Debt.amount` instead.
 *
 * **Semantic note**: `revenue` on this report therefore blends cash
 * collected (from counts) with credit sales value (owed, not yet
 * collected) — it is "sales value for the period," not pure cash. Debt
 * collection is tracked separately via the Customer ledger.
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
      stockCountId: null,
    };
  }

  const latest = counts[0];
  const prev = counts[1] ?? null;

  const [saleMovement, revenueMovement, creditSaleAgg] = await Promise.all([
    prisma.stockMovement.findFirst({
      where: { stockCountId: latest.id, movementType: "sale" },
      select: { quantity: true },
    }),
    prisma.moneyMovement.findFirst({
      where: { sourceType: "canteen_sale", sourceId: latest.id },
      select: { amount: true },
    }),
    prisma.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        productId,
        locationId: canteenLocationId,
        movementType: "sale",
        customerId: { not: null },
        stockCountId: null,
        occurredAt: { ...(prev ? { gt: prev.occurredAt } : {}), lte: latest.occurredAt },
      },
    }),
  ]);

  const countUnitsSold = saleMovement
    ? saleMovement.quantity.negated()
    : new Prisma.Decimal(0);
  const countRevenue = revenueMovement
    ? revenueMovement.amount
    : new Prisma.Decimal(0);

  const creditUnitsSold = (creditSaleAgg._sum.quantity ?? new Prisma.Decimal(0)).negated();
  let creditRevenue = new Prisma.Decimal(0);
  if (!creditUnitsSold.isZero()) {
    const creditMovementIds = await prisma.stockMovement.findMany({
      where: {
        productId,
        locationId: canteenLocationId,
        movementType: "sale",
        customerId: { not: null },
        stockCountId: null,
        correctsMovementId: null,
        occurredAt: { ...(prev ? { gt: prev.occurredAt } : {}), lte: latest.occurredAt },
      },
      select: { id: true },
    });
    if (creditMovementIds.length > 0) {
      const debtAgg = await prisma.debt.aggregate({
        _sum: { amount: true },
        where: {
          sourceType: "canteen_credit_sale",
          sourceId: { in: creditMovementIds.map((m) => m.id) },
        },
      });
      creditRevenue = debtAgg._sum.amount ?? new Prisma.Decimal(0);
    }
  }

  const unitsSold = countUnitsSold.add(creditUnitsSold);
  const revenue = countRevenue.add(creditRevenue);

  return {
    productId,
    productName,
    lastCountedAt: latest.occurredAt.toISOString(),
    periodStart: prev ? prev.occurredAt.toISOString() : null,
    periodEnd: latest.occurredAt.toISOString(),
    unitsSold: quantityString(unitsSold),
    revenue: moneyString(revenue),
    stockCountId: latest.id,
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
      stockCountId: null,
    };
  }

  return viewForProduct(productId, product.name, canteenLocationId, {});
}

/**
 * All canteen products (or one), newest count first. `date` windows on
 * the latest count's `occurredAt`; `from`/`to` window an inclusive range
 * the same way and take precedence over `date`. A product with no count
 * in scope is still listed with `null` figures.
 */
export async function listDerivedSales(
  filter: ListDerivedSalesFilter,
  ctx: ActorContext,
): Promise<DerivedSaleView[]> {
  const scope = resolveScope(ctx);

  const countFilter: Prisma.StockCountWhereInput = {};
  if (filter.from || filter.to) {
    countFilter.occurredAt = {};
    if (filter.from) countFilter.occurredAt.gte = businessDateStartUtc(filter.from);
    if (filter.to) countFilter.occurredAt.lt = businessDateEndUtc(filter.to);
  } else if (filter.date) {
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
