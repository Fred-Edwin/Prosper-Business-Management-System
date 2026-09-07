// Stock-value KPI figures for the Admin Stock & Reconciliation screen's
// page-top band (client request 2026-09-07). Four money figures — Opening
// Stock Value, Closing Stock Value, COGS, Non-Sale Stock Value — for the
// selected range, each obtainable All / Restaurant / Canteen / Store.
//
// This module owns only the two STOCK-derived figures (opening value,
// closing value) plus the non-sale value; COGS and the sales side come
// from `getFinancialSummary`'s `perLocation` slice, which the screen
// already fetches. Keeping them here rather than folding new fields onto
// `LedgerTotals` (a frozen kit type) means one tested place, shared by
// both the single-day and the Week/Month paths.
//
// ── How opening/closing are derived ───────────────────────────────────
// Identical rule to `derive-ledger.ts` / `derive-period-summary.ts`
// (ADR-11): closing is the derived balance AS OF the range's last day
// (passed in as `closingByPair`, the same `GET /stock-movements/balances`
// figure the grid uses); opening is walked BACK from it by subtracting
// the range's own columned movements — NOT read forward from the day
// before `from`. This self-heals for `opening` / `stock_count` rows that
// feed no column exactly as it does on the grid: a product whose opening
// stock was entered mid-range still yields a truthful, non-contradictory
// Opening figure.
//
// ── Valuation (ADR-55) ───────────────────────────────────────────────
// Per unit on hand / consumed:
//   - ingredient / goods → `buyingPrice`
//   - dish (opening/closing) → 0   (its ingredients were already counted
//     when issued; ADR-33 keeps a dish's buyingPrice at 0)
//   - dish (non-sale) → `dishWasteCostPercent × Restaurant sellingPrice`
//     — the SAME proxy `getFinancialSummary` applies, so this band's
//     Non-Sale figure agrees with the Financials screen's to the shilling.

import type { MovementType, StockMovementView } from "./types";

type Kind = "ingredient" | "dish" | "goods";

/** Minimal product shape this module needs — a subset of `ProductWithLocations`. */
export type StockValueProduct = {
  id: string;
  kind: Kind;
  buyingPrice?: string | null;
  locations: { locationId: string; sellingPrice: string | null }[];
};

/** Minimal location shape — a subset of the catalog `Location`. */
export type StockValueLocation = {
  id: string;
  type: "restaurant" | "canteen" | "store" | string;
};

/** The four money figures, as plain numbers (KES). */
export type StockValueFigures = {
  openingValue: number;
  closingValue: number;
  /** Non-sale consumption value over the range (ADR-55 valuation). */
  nonSaleValue: number;
};

export type StockValueScope = "all" | "restaurant" | "canteen" | "store";

export type StockValueKpis = Record<StockValueScope, StockValueFigures>;

export type DeriveStockValueKpisInput = {
  /** Every movement row across the whole range (already the screen's fetched set). */
  movements: StockMovementView[];
  /** Derived balance AS OF the range's last day, per `${productId}@${locationId}`. */
  closingByPair: Map<string, string>;
  products: StockValueProduct[];
  locations: StockValueLocation[];
  /** `getFinancialSummary`'s `nonSaleConsumption.dishWasteCostPercent` (e.g. 0.6). */
  dishWasteCostPercent: number;
};

// Columned movement types — the ones whose quantity moves the derived
// balance between opening and closing. `opening` / `stock_count` /
// `closing` / `purchase_payment` feed no column (their effect is already
// inside the derived closing balance). Mirrors `COLUMN_FOR_TYPE` in
// derive-ledger.ts — kept as its own list because the two are
// independently tested pure modules; a routing change must be made in
// both, deliberately.
const COLUMNED: ReadonlySet<MovementType> = new Set<MovementType>([
  "purchase_receipt",
  "issue",
  "production",
  "transfer",
  "sale",
  "non_sale_consumption",
  "variance",
]);

function num(s: string | null | undefined): number {
  const n = Number(s ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function pairKey(productId: string, locationId: string): string {
  return `${productId}@${locationId}`;
}

const ZERO = (): StockValueFigures => ({
  openingValue: 0,
  closingValue: 0,
  nonSaleValue: 0,
});

/**
 * Compute the stock-value band figures for every scope in one pass.
 *
 * The screen picks the scope with a local toggle; COGS is layered on by
 * the caller from `getFinancialSummary` (`perLocation` for a single
 * location, `consolidated` for "all").
 */
export function deriveStockValueKpis(
  input: DeriveStockValueKpisInput,
): StockValueKpis {
  const { movements, closingByPair, products, locations, dishWasteCostPercent } =
    input;

  const productById = new Map(products.map((p) => [p.id, p]));
  const scopeByLocationId = new Map<string, StockValueScope>();
  for (const l of locations) {
    if (l.type === "restaurant" || l.type === "canteen" || l.type === "store") {
      scopeByLocationId.set(l.id, l.type);
    }
  }

  // Cost of one unit on hand (opening/closing): dish → 0, else buyingPrice.
  const onHandUnitCost = (product: StockValueProduct | undefined): number => {
    if (!product || product.kind === "dish") return 0;
    return num(product.buyingPrice);
  };

  // Cost of one unit consumed non-sale: dish → percent × Restaurant
  // selling price (ADR-55), else buyingPrice.
  const restaurantIds = new Set(
    locations.filter((l) => l.type === "restaurant").map((l) => l.id),
  );
  const nonSaleUnitCost = (product: StockValueProduct | undefined): number => {
    if (!product) return 0;
    if (product.kind !== "dish") return num(product.buyingPrice);
    const sell =
      product.locations.find((pl) => restaurantIds.has(pl.locationId))
        ?.sellingPrice ?? product.locations[0]?.sellingPrice;
    return num(sell) * dishWasteCostPercent;
  };

  const out: StockValueKpis = {
    all: ZERO(),
    restaurant: ZERO(),
    canteen: ZERO(),
    store: ZERO(),
  };

  const add = (scope: StockValueScope, f: Partial<StockValueFigures>) => {
    out[scope].openingValue += f.openingValue ?? 0;
    out[scope].closingValue += f.closingValue ?? 0;
    out[scope].nonSaleValue += f.nonSaleValue ?? 0;
  };

  // ── Closing value + the columned delta for the opening walk-back ──────
  // Seed pairs from BOTH the movement set and the closing map (a pair can
  // have a non-zero closing balance with no movement inside the range).
  const pairs = new Set<string>();
  for (const m of movements) pairs.add(pairKey(m.productId, m.locationId));
  for (const key of closingByPair.keys()) pairs.add(key);

  for (const key of pairs) {
    const [productId, locationId] = key.split("@");
    const scope = scopeByLocationId.get(locationId);
    if (!scope) continue; // a location type we don't surface

    const product = productById.get(productId);
    const closingQty = num(closingByPair.get(key));

    const rowMovements = movements.filter(
      (m) => m.productId === productId && m.locationId === locationId,
    );

    let columnedDelta = 0;
    let nonSaleUnits = 0;
    for (const m of rowMovements) {
      if (COLUMNED.has(m.movementType)) columnedDelta += num(m.quantity);
      if (m.movementType === "non_sale_consumption") {
        nonSaleUnits += Math.abs(num(m.quantity));
      }
    }

    const openingQty = closingQty - columnedDelta;

    const onHand = onHandUnitCost(product);
    const figures: StockValueFigures = {
      openingValue: openingQty * onHand,
      closingValue: closingQty * onHand,
      nonSaleValue: nonSaleUnits * nonSaleUnitCost(product),
    };

    add(scope, figures);
    add("all", figures);
  }

  return out;
}
