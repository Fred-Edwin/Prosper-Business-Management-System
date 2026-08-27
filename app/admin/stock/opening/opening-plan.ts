// Pure planning logic for the bulk opening-stock grid: given the per-row
// editable-cell state and the catalog, decide which rows are "dirty" and
// build one `setOpeningStock` request body per dirty row. Kept out of the
// React component so it can be unit-tested without a DOM.

import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { ProductKind } from "@prisma/client";

export type LocType = Location["type"];

/** Which location type "owns" the opening count for a product kind. */
export function homeLocationType(kind: ProductKind): LocType {
  return kind === "dish" ? "restaurant" : "store";
}

/** One grid row's editable-cell state. */
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
 * Build the ordered list of opening-stock POST bodies for every dirty row.
 *
 * A row is **dirty** when its input is a valid unsigned magnitude, non-empty,
 * and different from what was last saved. Rows whose input is blank,
 * unchanged, or not a valid number are skipped (no request).
 *
 * One body per dirty row — the caller fires them (sequential or Promise.all).
 */
export function planOpeningPosts(
  rowState: Record<string, OpeningRowState>,
  products: ProductWithLocations[],
  locations: Location[],
  businessDate: string,
): OpeningPost[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const firstLocByType = new Map<LocType, Location>();
  for (const l of locations) {
    if (!firstLocByType.has(l.type)) firstLocByType.set(l.type, l);
  }

  const posts: OpeningPost[] = [];
  for (const [productId, rs] of Object.entries(rowState)) {
    const input = rs.input.trim();
    if (input === "" || input === rs.saved || !MAGNITUDE.test(input)) continue;

    const product = productById.get(productId);
    if (!product) continue;
    const location = firstLocByType.get(homeLocationType(product.kind));
    if (!location) continue;

    posts.push({
      productId,
      locationId: location.id,
      businessDate,
      quantity: input,
      isResubmit: rs.saved !== "",
    });
  }
  return posts;
}
