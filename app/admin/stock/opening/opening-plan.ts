// Pure planning logic for the bulk opening-stock grid: given the per-cell
// editable state and the catalog, decide which cells are "dirty" and
// build one `setOpeningStock` request body per dirty cell. Kept out of the
// React component so it can be unit-tested without a DOM.
//
// SESSION 16 (2026-09-04): rewritten from one-cell-per-product to
// **one cell per (product × location it is stocked at)**. The old model
// assigned every product a single "home location" by kind
// (dish → restaurant, everything else → store), which post-ADR-67 is
// broken two ways: `goods` at the Store is now rejected by the domain
// guard, and a product sold at both the Restaurant AND the Canteen
// (Soda, Water) had nowhere to enter the second location's count. The
// grid now shows a real editable cell for each of a product's active
// `ProductLocation` rows.

import type { ProductWithLocations } from "@/lib/domain/catalog";

/** Composite key for one editable cell: `${productId}:${locationId}`. */
export function cellKey(productId: string, locationId: string): string {
  return `${productId}:${locationId}`;
}

/** One editable cell's state. */
export type OpeningRowState = {
  /** raw text in the editable cell */
  input: string;
  /** last value successfully saved this session ("" = never) */
  saved: string;
};

/** A single POST /api/stock-movements { movementType: "opening" } body. */
export type OpeningPost = {
  productId: string;
  locationId: string;
  businessDate: string;
  quantity: string;
  /** true when this product/location/date already had an opening saved this
   *  session — the server treats the second write as a correction (ADR-15). */
  isResubmit: boolean;
};

const MAGNITUDE = /^\d+(\.\d{1,4})?$/;

/**
 * The (product, location) pairs that get an editable opening cell: every
 * **active** `ProductLocation` on the product. `ProductLocation` already
 * models "this product is stocked/sold here" and the catalog never
 * assigns an ingredient to a selling location or a dish/goods to the
 * Store, so this list is exactly the set the ADR-67 domain guard accepts.
 */
export function openingCellsFor(
  product: ProductWithLocations,
): Array<{ locationId: string; locationName: string; locationType: string }> {
  return product.locations
    .filter((l) => l.active)
    .map((l) => ({
      locationId: l.locationId,
      locationName: l.locationName,
      locationType: l.locationType,
    }));
}

/**
 * Build the ordered list of opening-stock POST bodies for every dirty cell.
 *
 * A cell is **dirty** when its input is a valid unsigned magnitude,
 * non-empty, and different from what was last saved. Cells whose input is
 * blank, unchanged, or not a valid number are skipped (no request).
 *
 * `cellState` is keyed by `cellKey(productId, locationId)`. One body per
 * dirty cell — the caller fires them (sequential or Promise.all).
 */
export function planOpeningPosts(
  cellState: Record<string, OpeningRowState>,
  products: ProductWithLocations[],
  businessDate: string,
): OpeningPost[] {
  const productById = new Map(products.map((p) => [p.id, p]));

  const posts: OpeningPost[] = [];
  for (const [key, rs] of Object.entries(cellState)) {
    const input = rs.input.trim();
    if (input === "" || input === rs.saved || !MAGNITUDE.test(input)) continue;

    const sep = key.lastIndexOf(":");
    if (sep <= 0) continue;
    const productId = key.slice(0, sep);
    const locationId = key.slice(sep + 1);

    const product = productById.get(productId);
    if (!product) continue;
    // The cell must correspond to a real active assignment on the product.
    if (!product.locations.some((l) => l.active && l.locationId === locationId)) {
      continue;
    }

    posts.push({
      productId,
      locationId,
      businessDate,
      quantity: input,
      isResubmit: rs.saved !== "",
    });
  }
  return posts;
}
