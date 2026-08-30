import { prisma } from "@/lib/db";
import type { ProductWithLocations, UpdateProductInput } from "./types";
import {
  normaliseProductCore,
  parseSellingPrice,
  productInclude,
  toProductView,
} from "./internal";
import { DomainError } from "./errors";

/**
 * Edit a product in place — a catalog entry is not a ledger, so this is a
 * true edit, not a correction row (CONVENTIONS.md §4).
 *
 * - Same name/unit/kind validation and the same Dish invariant as create;
 *   switching `kind` to `dish` zeroes `buyingPrice` here too.
 * - Per-location rows are reconciled to the submitted set:
 *     * present  → upsert (by `@@unique([productId, locationId])`)
 *     * dropped  → **deactivated** (`active = false`, price kept), not
 *       deleted. A `ProductLocation` can be referenced by historical
 *       `StockMovement` / `Order` rows indirectly via the product; keeping
 *       the row preserves any future audit need and lets a re-enable
 *       restore the last price. (ADR — see DECISIONS.md.)
 * - `NOT_FOUND` if the product is missing / soft-deleted.
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductWithLocations> {
  const core = normaliseProductCore(input);

  const seenLocationIds = new Set<string>();
  const submitted = input.locations.map((loc) => {
    if (seenLocationIds.has(loc.locationId)) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "A location was listed twice.",
        "locations",
      );
    }
    seenLocationIds.add(loc.locationId);
    return {
      locationId: loc.locationId,
      active: loc.active,
      sellingPrice: parseSellingPrice(loc.sellingPrice, loc.locationId),
    };
  });

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id },
      include: { productLocations: true },
    });
    if (!existing || existing.deletedAt) {
      throw new DomainError("NOT_FOUND", "Product not found.");
    }

    if (submitted.length > 0) {
      const found = await tx.location.count({
        where: { id: { in: submitted.map((l) => l.locationId) } },
      });
      if (found !== submitted.length) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "One or more selected locations do not exist.",
          "locations",
        );
      }
    }

    await tx.product.update({
      where: { id },
      data: {
        name: core.name,
        kind: input.kind,
        unitLabel: core.unitLabel,
        buyingPrice: core.buyingPrice,
        category: input.category ?? null,
      },
    });

    for (const loc of submitted) {
      await tx.productLocation.upsert({
        where: {
          productId_locationId: { productId: id, locationId: loc.locationId },
        },
        create: {
          productId: id,
          locationId: loc.locationId,
          active: loc.active,
          sellingPrice: loc.sellingPrice,
        },
        update: {
          active: loc.active,
          sellingPrice: loc.sellingPrice,
        },
      });
    }

    const submittedIds = new Set(submitted.map((l) => l.locationId));
    const droppedIds = existing.productLocations
      .filter((pl) => !submittedIds.has(pl.locationId) && pl.active)
      .map((pl) => pl.id);
    if (droppedIds.length > 0) {
      await tx.productLocation.updateMany({
        where: { id: { in: droppedIds } },
        data: { active: false },
      });
    }

    return tx.product.findUniqueOrThrow({
      where: { id },
      include: productInclude,
    });
  });

  return toProductView(updated, { stripBuyingPrice: false });
}
