import { prisma } from "@/lib/db";
import type { ProductWithLocations } from "./types";
import { productInclude, toProductView } from "./internal";
import { DomainError } from "./errors";

/**
 * Fetch a single product (with its per-location pricing) for the edit
 * drawer. Throws `NOT_FOUND` if the product is missing or soft-deleted.
 *
 * Returns the buying price unstripped — only the Admin catalog calls this.
 */
export async function getProduct(id: string): Promise<ProductWithLocations> {
  const row = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!row || row.deletedAt) {
    throw new DomainError("NOT_FOUND", "Product not found.");
  }

  return toProductView(row, { stripBuyingPrice: false });
}
