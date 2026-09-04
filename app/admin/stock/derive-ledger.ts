// Pure ledger-column derivation. No React, no fetch — given the raw
// movement list for a business day (from GET /api/stock-movements) plus that
// day's closing balances (from GET /api/stock-movements/balances), produce
// the LedgerRow[] / LedgerTotals the kit <DenseLedger> renders.
//
// Ledger, not stored totals (CLAUDE.md / ADR-11 / ADR-14):
//   closing  = the day's derived balance (passed in as `dayClosing`; never a column)
//   opening  = closing − Σ(this day's columned movements for the pair)
//
// Note the direction: Opening is walked BACK from the day's real closing,
// rather than read forward from the prior day's closing. The two agree
// whenever every movement on the day feeds a column — but `opening` and
// `stock_count` rows deliberately feed none, and they still move the real
// balance. Reading forward made those rows invisible: on the very day a
// product's opening stock was established the grid showed
// "Opening 0.0 · all columns — · Closing 0.0" while the balances API
// reported real stock for the same date (F4, owner report 2026-09-02).
// Subtracting only the columned movements leaves any non-columned effect
// inside Opening, so Closing can never contradict the balances API again,
// and the rule self-heals for any future null-column movement type.
//
// The "value" columns (closingValue, soldValue) are opening/closing × unit
// cost — cost data the F2 wire does NOT carry for every type, so they render
// "—" until F3/F4 (see the flag in the Session 7 wrap-up).
//
// Corrections need no special handling (ADR-39): correctMovement writes the
// delta as an ordinary signed `quantity` row of the same movementType, so
// summing every row — originals and correction deltas alike — lands the
// figure once, in the right column.

import type { LedgerRow, LedgerTotals, LedgerCell } from "@/components/kit/dense-ledger";
import type { MovementType, StockMovementView } from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";

const DASH: LedgerCell = { dash: true };

/** Where a movementType routes. `"transfer"` = sign decides In vs Out; `null` = no column. */
type ColumnRoute = keyof LedgerColumnSums | "transfer" | null;

/**
 * Which ledger column a movementType feeds.
 *
 * `non_sale_consumption` → its own `nonSale` column (this session, owner
 * review). It used to route to "issues" alongside real Kitchen draws —
 * merging two different events (a normal Store→Kitchen transfer vs. stock
 * that left for an exceptional reason: wastage/staff-meal/complimentary/
 * damaged/other) into one number with no way to tell them apart on the
 * grid. `<DenseLedger>`'s `nonSale` column + this routing change together
 * are the fix; the correction drawer's per-movement breakdown (below)
 * surfaces the `reason` for a cell backed by more than one movement.
 */
const COLUMN_FOR_TYPE: Record<MovementType, ColumnRoute> = {
  opening: null, // no column — its effect stays inside the derived Opening figure
  purchase_payment: null, // no stock effect (quantity = 0) — never on the grid
  purchase_receipt: "purchases",
  issue: "issues",
  production: "production",
  transfer: "transfer", // sign decides transferIn vs transferOut
  sale: "sold",
  non_sale_consumption: "nonSale",
  stock_count: null, // ditto: an adjusting count lands in Opening, not a column
  closing: null,
  // F6 (owner decision 2026-09-02): stock that left on a transfer and never
  // arrived. It reads as an outflow alongside issues so the TOTAL closing
  // reconciles and the loss is visible on the grid. A column of its own is
  // a separate, not-yet-raised owner decision (unlike nonSale above) —
  // left as-is.
  variance: "issues",
};

type LedgerColumnSums = {
  purchases: number;
  issues: number;
  nonSale: number;
  production: number;
  transferIn: number;
  transferOut: number;
  sold: number;
};

const ZERO_SUMS = (): LedgerColumnSums => ({
  purchases: 0,
  issues: 0,
  nonSale: 0,
  production: 0,
  transferIn: 0,
  transferOut: 0,
  sold: 0,
});

/** A movement grouped under one (productId, locationId) pair for a day. */
export type LedgerGroupKey = string; // `${productId}@${locationId}`

export function groupKey(productId: string, locationId: string): LedgerGroupKey {
  return `${productId}@${locationId}`;
}

function num(decimalString: string): number {
  const n = Number(decimalString);
  return Number.isFinite(n) ? n : 0;
}

/** Format a signed quantity the way the Paper ledger shows movement cells: "+50.0" / "-18.5". */
function signed(n: number): string {
  const fixed = n.toFixed(1);
  return n > 0 ? `+${fixed}` : fixed; // toFixed already carries the "-"
}

/** A movement cell: "—" when zero, else the signed value in the semantic tone. */
function movementCell(
  n: number,
  tone: "success" | "danger",
  corrected: boolean,
): LedgerCell {
  if (n === 0) return { ...DASH };
  return { value: signed(n), tone, ...(corrected ? { corrected: true } : {}) };
}

export type DeriveLedgerInput = {
  /** Every movement row for the active business day (already location-scoped by the API). */
  movements: StockMovementView[];
  /** The selected day's closing balance per `${productId}@${locationId}` (closing = this). */
  dayClosing: Map<string, string>;
  products: ProductWithLocations[];
  locations: Location[];
  /** Only rows at this location when set; all locations otherwise. */
  locationId?: string;
};

/**
 * Build the ledger rows. One row per (product, location) pair that either
 * carries a non-zero balance at either end of the day, or moved during it.
 */
export function deriveLedgerRows(input: DeriveLedgerInput): {
  rows: LedgerRow[];
  totals: LedgerTotals;
  /** For each row id, the movement ids behind each column — the correction target. */
  cellMovements: Map<string, Partial<Record<string, string[]>>>;
} {
  const { movements, dayClosing, products, locations } = input;

  const productById = new Map(products.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  // Collect every pair we need a row for: from movements + from the day's balances.
  const pairs = new Set<LedgerGroupKey>();
  for (const m of movements) {
    if (input.locationId && m.locationId !== input.locationId) continue;
    pairs.add(groupKey(m.productId, m.locationId));
  }
  for (const key of dayClosing.keys()) {
    const [, loc] = key.split("@");
    if (input.locationId && loc !== input.locationId) continue;
    // Only surface a movement-free row when it actually holds stock.
    if (num(dayClosing.get(key) ?? "0") !== 0) pairs.add(key);
  }

  const sums = ZERO_SUMS();
  let totalOpening = 0;
  let totalClosing = 0;

  const rows: LedgerRow[] = [];
  const cellMovements = new Map<string, Partial<Record<string, string[]>>>();

  for (const key of [...pairs].sort()) {
    const [productId, locationId] = key.split("@");
    const product = productById.get(productId);
    const location = locationById.get(locationId);

    const closing = num(dayClosing.get(key) ?? "0");

    const rowMovements = movements.filter(
      (m) => m.productId === productId && m.locationId === locationId,
    );

    const col: LedgerColumnSums = {
      purchases: 0,
      issues: 0,
      nonSale: 0,
      production: 0,
      transferIn: 0,
      transferOut: 0,
      sold: 0,
    };
    const correctedCols = new Set<string>();
    const perCell: Partial<Record<string, string[]>> = {};

    for (const m of rowMovements) {
      const target = COLUMN_FOR_TYPE[m.movementType];
      if (!target) continue;
      const q = num(m.quantity); // already signed from this location's POV
      let columnKey: keyof LedgerColumnSums;
      if (target === "transfer") {
        columnKey = q >= 0 ? "transferIn" : "transferOut";
      } else {
        columnKey = target;
      }
      col[columnKey] += q;
      (perCell[columnKey] ??= []).push(m.id);
      if (m.correctsMovementId) correctedCols.add(columnKey);
    }

    // Opening is walked back from the day's real closing — see the header note.
    const opening =
      closing -
      (col.purchases +
        col.issues +
        col.nonSale +
        col.production +
        col.transferIn +
        col.transferOut +
        col.sold);

    sums.purchases += col.purchases;
    sums.issues += col.issues;
    sums.nonSale += col.nonSale;
    sums.production += col.production;
    sums.transferIn += col.transferIn;
    sums.transferOut += col.transferOut;
    sums.sold += col.sold;
    totalOpening += opening;
    totalClosing += closing;

    const rowId = key;
    cellMovements.set(rowId, perCell);

    rows.push({
      id: rowId,
      location: location?.name ?? locationId,
      product: product ? `${product.name} (${product.unitLabel})` : productId,
      opening: { value: opening.toFixed(1) },
      purchases: movementCell(col.purchases, "success", correctedCols.has("purchases")),
      issues: movementCell(col.issues, "danger", correctedCols.has("issues")),
      nonSale: movementCell(col.nonSale, "danger", correctedCols.has("nonSale")),
      production: movementCell(col.production, "success", correctedCols.has("production")),
      transferIn: movementCell(col.transferIn, "success", correctedCols.has("transferIn")),
      transferOut: movementCell(col.transferOut, "danger", correctedCols.has("transferOut")),
      sold: movementCell(col.sold, "danger", correctedCols.has("sold")),
      // Value columns need per-unit cost the F2 wire doesn't carry for every
      // type — rendered muted until F3/F4 (flagged in the Session 7 wrap-up).
      soldValue: { ...DASH },
      closing: { value: closing.toFixed(1) },
      closingValue: { ...DASH },
    });
  }

  const totals: LedgerTotals = {
    label: "Total",
    opening: { value: totalOpening.toFixed(1) },
    purchases: sums.purchases === 0 ? { ...DASH } : { value: signed(sums.purchases), tone: "success" },
    issues: sums.issues === 0 ? { ...DASH } : { value: signed(sums.issues), tone: "danger" },
    nonSale: sums.nonSale === 0 ? { ...DASH } : { value: signed(sums.nonSale), tone: "danger" },
    production: sums.production === 0 ? { ...DASH } : { value: signed(sums.production), tone: "success" },
    transferIn: sums.transferIn === 0 ? { ...DASH } : { value: signed(sums.transferIn), tone: "success" },
    transferOut: sums.transferOut === 0 ? { ...DASH } : { value: signed(sums.transferOut), tone: "danger" },
    sold: sums.sold === 0 ? { ...DASH } : { value: signed(sums.sold), tone: "danger" },
    soldValue: { ...DASH },
    closing: { value: totalClosing.toFixed(1) },
    closingValue: { ...DASH },
  };

  return { rows, totals, cellMovements };
}
