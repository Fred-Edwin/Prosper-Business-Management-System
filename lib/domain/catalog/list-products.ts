import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTotalStockByProduct } from "@/lib/domain/stock";
import type {
  ActorContext,
  ListProductsFilter,
  ProductWithLocations,
} from "./types";
import { productInclude, toProductView } from "./internal";
import { DomainError } from "./errors";

/**
 * List catalog products with their per-location pricing.
 *
 * - `kind` / `search` (case-insensitive `name` contains) / `includeArchived`
 *   filter the set; soft-deleted rows are excluded unless `includeArchived`.
 * - `locationId` restricts to products with an **active** `ProductLocation`
 *   at that location (assignment, not stock-on-hand).
 * - Non-`admin` callers get `buyingPrice` stripped to `null`
 *   (API.md: "buying price stripped for non-Admin").
 * - Deterministic order: kind, then name.
 */
export async function listProducts(
  filter: ListProductsFilter & { includeStock?: boolean },
  actor: ActorContext,
): Promise<ProductWithLocations[]> {
  const where: Prisma.ProductWhereInput = {};

  if (!filter.includeArchived) {
    where.deletedAt = null;
  }
  if (filter.kind) {
    where.kind = filter.kind;
  }
  if (filter.search && filter.search.trim() !== "") {
    where.name = { contains: filter.search.trim(), mode: "insensitive" };
  }
  if (filter.category && filter.category.trim() !== "") {
    where.category = filter.category.trim();
  }
  if (filter.locationId && filter.locationId.trim() !== "") {
    where.productLocations = {
      some: { locationId: filter.locationId.trim(), active: true },
    };
  }

  if (filter.lowStockOnly && !filter.includeStock) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "lowStockOnly requires includeStock.",
      "lowStockOnly",
    );
  }

  const rows = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const stripBuyingPrice = actor.role !== "admin";
  const views = rows.map((row) => toProductView(row, { stripBuyingPrice }));
  const thresholdByProduct = new Map(
    rows.map((r) => [r.id, r.lowStockThreshold]),
  );

  // Admin-only (route already gates the query param to admin callers) —
  // one grouped aggregate for the whole page, not N+1.
  if (filter.includeStock && actor.role === "admin") {
    const stockByProduct = await getTotalStockByProduct(views.map((v) => v.id));
    for (const view of views) {
      view.stockQty = stockByProduct[view.id];
    }

    if (filter.lowStockOnly) {
      return views.filter((v) => {
        if (v.stockQty == null) return false;
        const threshold = thresholdByProduct.get(v.id) ?? new Prisma.Decimal(0);
        return new Prisma.Decimal(v.stockQty).lte(threshold);
      });
    }
  }

  return views;
}
