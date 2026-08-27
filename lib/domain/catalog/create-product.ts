import { prisma } from "@/lib/db";
import type { CreateProductInput, ProductWithLocations } from "./types";
import {
  normaliseProductCore,
  parseSellingPrice,
  productInclude,
  toProductView,
} from "./internal";
import { DomainError } from "./errors";

/**
 * Create a Product plus one `ProductLocation` row per submitted location,
 * in a single transaction.
 *
 * - name / unitLabel trimmed + non-empty; `kind` a valid enum (Zod already
 *   guarantees the enum at the route; the domain still guards the strings).
 * - Dish invariant (ADR-33): `kind === "dish"` ⇒ `buyingPrice = 0`,
 *   whatever was passed. `ingredient` / `goods` require `buyingPrice >= 0`.
 * - A location row with `active === false` may carry a `null` selling price
 *   (stocked but not sold); an active row with no price is allowed too
 *   (price TBD) and stored as `null`.
 */
export async function createProduct(
  input: CreateProductInput,
): Promise<ProductWithLocations> {
  const core = normaliseProductCore(input);

  const seenLocationIds = new Set<string>();
  const locationData = input.locations.map((loc) => {
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

  const created = await prisma.$transaction(async (tx) => {
    const locationIds = locationData.map((l) => l.locationId);
    if (locationIds.length > 0) {
      const found = await tx.location.count({
        where: { id: { in: locationIds } },
      });
      if (found !== locationIds.length) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "One or more selected locations do not exist.",
          "locations",
        );
      }
    }

    return tx.product.create({
      data: {
        name: core.name,
        kind: input.kind,
        unitLabel: core.unitLabel,
        buyingPrice: core.buyingPrice,
        productLocations: {
          create: locationData.map((l) => ({
            locationId: l.locationId,
            active: l.active,
            sellingPrice: l.sellingPrice,
          })),
        },
      },
      include: productInclude,
    });
  });

  return toProductView(created, { stripBuyingPrice: false });
}
