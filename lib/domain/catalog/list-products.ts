import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  ActorContext,
  ListProductsFilter,
  ProductWithLocations,
} from "./types";
import { productInclude, toProductView } from "./internal";

/**
 * List catalog products with their per-location pricing.
 *
 * - `kind` / `search` (case-insensitive `name` contains) / `includeArchived`
 *   filter the set; soft-deleted rows are excluded unless `includeArchived`.
 * - Non-`admin` callers get `buyingPrice` stripped to `null`
 *   (API.md: "buying price stripped for non-Admin").
 * - Deterministic order: kind, then name.
 */
export async function listProducts(
  filter: ListProductsFilter,
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

  const rows = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const stripBuyingPrice = actor.role !== "admin";
  return rows.map((row) => toProductView(row, { stripBuyingPrice }));
}
