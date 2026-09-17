import type { Location, ProductKind, Role } from "@prisma/client";

export type { Location } from "@prisma/client";

/**
 * Catalog domain shapes. Shared by the domain functions, the Zod schemas
 * in `lib/validation/catalog.ts`, and the frontend hook.
 *
 * Money crosses this boundary as a `string` (a decimal literal like
 * `"580.00"`) so it survives JSON without ever becoming a float — the
 * domain converts to/from Prisma `Decimal` internally. `null` means "no
 * value" (e.g. a Dish has no buying price on the wire either — it reads
 * back as `"0.00"`; a location that is stocked but not sold has a `null`
 * selling price).
 */

export type LocationPriceInput = {
  locationId: string;
  /** Decimal string, or `null` when the location is stocked but not sold at. */
  sellingPrice: string | null;
  active: boolean;
};

export type CreateProductInput = {
  name: string;
  kind: ProductKind;
  unitLabel: string;
  /** Required for `ingredient` / `goods`; ignored (forced to 0) for `dish`. */
  buyingPrice?: string | null;
  /**
   * Admin-set menu category (e.g. "Mains", "Drinks"). Optional, free-text,
   * trimmed; empty → `null`. Powers the C2 / K1 category tab rows.
   */
  category?: string | null;
  /**
   * Reorder point (client feedback 2026-09-17) — when `stockQty` (total
   * on-hand, summed across every location) is at or below this, the
   * product counts as low stock. Decimal string, or `null`/omitted for no
   * threshold (falls back to the pre-existing `qty <= 0` rule). Ignored
   * for `kind: "dish"` (forced to `null` — a dish's stock is derived from
   * its recipe, ADR-33, never held directly).
   */
  lowStockThreshold?: string | null;
  locations: LocationPriceInput[];
};

export type UpdateProductInput = CreateProductInput;

export type ProductLocationView = {
  locationId: string;
  locationName: string;
  locationType: Location["type"];
  /** Decimal string, or `null`. */
  sellingPrice: string | null;
  active: boolean;
};

export type ProductWithLocations = {
  id: string;
  name: string;
  kind: ProductKind;
  unitLabel: string;
  /** Decimal string. `null` only when stripped for a non-admin role. */
  buyingPrice: string | null;
  /** Admin-set menu category, or `null` if uncategorised. */
  category: string | null;
  /** Reorder point, decimal string, or `null` if unset (see `CreateProductInput`). */
  lowStockThreshold: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  locations: ProductLocationView[];
  /**
   * Total on-hand quantity, summed across every location — a decimal
   * string, present only when the caller asked for `includeStock=true`
   * (admin-only, `list-products.ts`). `undefined` otherwise so existing
   * callers (Cashier grid, staff pickers) are unaffected.
   */
  stockQty?: string;
};

export type ListProductsFilter = {
  kind?: ProductKind;
  search?: string;
  includeArchived?: boolean;
  /** Exact-match on the menu category (used by C2's category tab row). */
  category?: string;
  /**
   * Restrict to products that have an **active** `ProductLocation` at this
   * location — the Catalog's "show products assigned to {location}"
   * filter. Assignment, not stock-on-hand; an inactive ProductLocation
   * (location dropped for the product) does not match.
   */
  locationId?: string;
  /**
   * Restrict to products currently low on stock — `stockQty <= (threshold
   * ?? 0)`. Requires `includeStock` (admin-only); the domain enforces this
   * rather than silently ignoring the flag.
   */
  lowStockOnly?: boolean;
};

export type ActorContext = {
  role: Role;
};
