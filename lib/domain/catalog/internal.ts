import { Prisma } from "@prisma/client";
import type { ProductWithLocations } from "./types";
import { DomainError } from "./errors";

/**
 * The Prisma include used by every read that returns a `ProductWithLocations`
 * — one place so list/get/create/update stay identical.
 */
export const productInclude = {
  productLocations: { include: { location: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Prisma `Decimal | null` → decimal string (`"580.00"`) | null. */
function money(value: Prisma.Decimal | null): string | null {
  return value == null ? null : value.toFixed(2);
}

/**
 * Map a Prisma product row (with `productLocations.location`) to the wire
 * shape. `stripBuyingPrice` blanks the buying price for non-admin callers
 * (API.md: "buying price stripped for non-Admin").
 */
export function toProductView(
  row: ProductRow,
  opts: { stripBuyingPrice: boolean },
): ProductWithLocations {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    unitLabel: row.unitLabel,
    buyingPrice: opts.stripBuyingPrice ? null : money(row.buyingPrice),
    category: row.category ?? null,
    lowStockThreshold: row.lowStockThreshold
      ? row.lowStockThreshold.toFixed(4).replace(/\.?0+$/, "")
      : null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    locations: row.productLocations
      .map((pl) => ({
        locationId: pl.locationId,
        locationName: pl.location.name,
        locationType: pl.location.type,
        sellingPrice: money(pl.sellingPrice),
        active: pl.active,
      }))
      .sort((a, b) => a.locationName.localeCompare(b.locationName)),
  };
}

/**
 * Validate + normalise the fields common to create and update. Returns the
 * trimmed name/unit and the resolved buying price as a `Prisma.Decimal`.
 *
 * Dish invariant (ADR-33): a `dish` always persists `buyingPrice = 0`,
 * whatever was passed. `ingredient` / `goods` require a `>= 0` value.
 */
export function normaliseProductCore(input: {
  name: string;
  kind: "ingredient" | "dish" | "goods";
  unitLabel: string;
  buyingPrice?: string | null;
  lowStockThreshold?: string | null;
}): {
  name: string;
  unitLabel: string;
  buyingPrice: Prisma.Decimal;
  lowStockThreshold: Prisma.Decimal | null;
} {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Product name is required.", "name");
  }

  const unitLabel = input.unitLabel.trim();
  if (unitLabel.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Unit label is required.", "unitLabel");
  }

  // A dish's stock is derived from its recipe (ADR-33) — never held
  // directly — so a reorder point on one would never mean anything.
  if (input.kind === "dish") {
    return {
      name,
      unitLabel,
      buyingPrice: new Prisma.Decimal(0),
      lowStockThreshold: null,
    };
  }

  if (input.buyingPrice == null || input.buyingPrice === "") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Buying price is required for ingredients and goods.",
      "buyingPrice",
    );
  }

  let buyingPrice: Prisma.Decimal;
  try {
    buyingPrice = new Prisma.Decimal(input.buyingPrice);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Buying price must be a number.", "buyingPrice");
  }
  if (buyingPrice.isNegative()) {
    throw new DomainError("VALIDATION_ERROR", "Buying price cannot be negative.", "buyingPrice");
  }

  let lowStockThreshold: Prisma.Decimal | null = null;
  if (input.lowStockThreshold != null && input.lowStockThreshold !== "") {
    try {
      lowStockThreshold = new Prisma.Decimal(input.lowStockThreshold);
    } catch {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Low stock threshold must be a number.",
        "lowStockThreshold",
      );
    }
    if (lowStockThreshold.isNegative()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Low stock threshold cannot be negative.",
        "lowStockThreshold",
      );
    }
  }

  return { name, unitLabel, buyingPrice, lowStockThreshold };
}

/** Parse a submitted per-location selling price to a `Decimal | null`. */
export function parseSellingPrice(
  value: string | null,
  locationId: string,
): Prisma.Decimal | null {
  if (value == null || value === "") return null;
  let dec: Prisma.Decimal;
  try {
    dec = new Prisma.Decimal(value);
  } catch {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Selling price for location ${locationId} must be a number.`,
      "locations",
    );
  }
  if (dec.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Selling price for location ${locationId} cannot be negative.`,
      "locations",
    );
  }
  return dec;
}
