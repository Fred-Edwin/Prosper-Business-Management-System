import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

/**
 * Archive (soft-delete) a product: set `Product.deletedAt = now()` and
 * deactivate its `ProductLocation` rows. Idempotent-ish — archiving an
 * already-archived product is a no-op success. `NOT_FOUND` only if the
 * product never existed.
 *
 * This is the safe path the delete dialog falls back to on a 409.
 */
export async function archiveProduct(id: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Product not found.");
  }
  if (existing.deletedAt) {
    return;
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.productLocation.updateMany({
      where: { productId: id },
      data: { active: false },
    }),
  ]);
}

/**
 * Permanently delete a product.
 *
 * - `confirmName` must equal `product.name` **exactly** (case-sensitive) —
 *   else `VALIDATION_ERROR` on `confirmName`.
 * - Referential guard: if any `StockMovement` or `OrderLine` references
 *   the product, throw `CONFLICT` — the frontend turns this into the
 *   "Archive instead" path. (`StockCount` / `RecipeIngredient` are also
 *   counted so a product tied to any history is protected.)
 * - Clean ⇒ delete the `ProductLocation` rows then the `Product`, in a
 *   transaction.
 */
export async function hardDeleteProduct(
  id: string,
  confirmName: string,
): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Product not found.");
  }

  if (confirmName !== existing.name) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "The typed name does not match the product name.",
      "confirmName",
    );
  }

  const [movements, orderLines, stockCounts, recipeUses] = await Promise.all([
    prisma.stockMovement.count({ where: { productId: id } }),
    prisma.orderLine.count({ where: { productId: id } }),
    prisma.stockCount.count({ where: { productId: id } }),
    prisma.recipeIngredient.count({ where: { ingredientProductId: id } }),
  ]);

  if (movements + orderLines + stockCounts + recipeUses > 0) {
    throw new DomainError(
      "CONFLICT",
      "Cannot delete a product with historical transactions — archive it instead.",
    );
  }

  await prisma.$transaction([
    prisma.productLocation.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);
}
