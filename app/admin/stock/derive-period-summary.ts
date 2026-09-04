// Pure period-summary derivation for the Week/Month ledger view (owner
// decision this session — see the Paper "M5b — Ledger v2" page for the
// approved direction). One row per (product, location), columns summed
// over the WHOLE `from..to` range instead of one day — same shape
// `<DenseLedger>` already renders, same column routing as `derive-ledger.ts`
// (`COLUMN_FOR_TYPE`), so the two derivations can't drift on what counts as
// a "purchase" vs a "sale" etc.
//
// Why a summary instead of one row per (product, location, day): a
// day-grouped table (see `deriveLedgerRows`) is the right shape for
// Today/Custom, where the reconciliation question is "what happened on
// THIS day." For a week or month, the question is almost always either
// "what's our position" (the KPI band) or "did anything unusual happen" —
// and a flat stack of N collapsed days doesn't help spot an outlier, it
// just grows with the range. A period total per product, with a drill-in
// to that product's own day-by-day (reusing `deriveLedgerRows`, filtered),
// keeps the row count constant regardless of range length and puts an
// unusual figure directly in view instead of burying it inside whichever
// day it happened to fall on.
//
// Opening/closing use the exact same backward-walk rule as
// `deriveLedgerRows` (ADR-11) — closing is the derived balance `asOf: to`;
// opening is walked BACK from it by subtracting the range's own columned
// movements, not read forward from `asOf: dayBeforeFrom`. This is what
// self-heals for `opening`/`stock_count` rows that feed no column (F4)
// exactly as it does for the single-day case — a product whose opening
// stock was entered mid-range still shows a truthful, non-contradictory
// Closing figure.

import type { LedgerRow, LedgerTotals, LedgerCell } from "@/components/kit/dense-ledger";
import type { MovementType, StockMovementView } from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";

const DASH: LedgerCell = { dash: true };

type ColumnRoute = keyof LedgerColumnSums | "transfer" | null;

// Identical routing to derive-ledger.ts's COLUMN_FOR_TYPE — kept as its own
// copy (not imported) because the two files are independently testable pure
// modules with no shared runtime state; if the routing ever needs to change
// it must change in both, deliberately, not silently for only one view.
const COLUMN_FOR_TYPE: Record<MovementType, ColumnRoute> = {
  opening: null,
  purchase_payment: null,
  purchase_receipt: "purchases",
  issue: "issues",
  production: "production",
  transfer: "transfer",
  sale: "sold",
  non_sale_consumption: "nonSale",
  stock_count: null,
  closing: null,
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

export type PeriodGroupKey = string; // `${productId}@${locationId}`

export function periodGroupKey(productId: string, locationId: string): PeriodGroupKey {
  return `${productId}@${locationId}`;
}

function num(decimalString: string): number {
  const n = Number(decimalString);
  return Number.isFinite(n) ? n : 0;
}

function signed(n: number): string {
  const fixed = n.toFixed(1);
  return n > 0 ? `+${fixed}` : fixed;
}

function movementCell(n: number, tone: "success" | "danger", corrected: boolean): LedgerCell {
  if (n === 0) return { ...DASH };
  return { value: signed(n), tone, ...(corrected ? { corrected: true } : {}) };
}

function costValueOf(product: ProductWithLocations | undefined): number {
  if (!product || product.kind === "dish") return 0;
  return num(product.buyingPrice ?? "0");
}

function valueCell(magnitude: number): LedgerCell {
  if (magnitude === 0) return { ...DASH };
  return { value: `KES ${magnitude.toLocaleString("en-KE", { maximumFractionDigits: 0 })}` };
}

export type PeriodSummaryRow = LedgerRow & {
  /** Non-zero `nonSale` outflow relative to the row's own sold volume — surfaced for the outlier scan (owner-approved amber flag in the mock). */
  flagged: boolean;
};

export type DerivePeriodSummaryInput = {
  /** Every movement row across the WHOLE `from..to` range (already location-scoped by the API). */
  movements: StockMovementView[];
  /** The closing balance AS OF `to`, per `${productId}@${locationId}` — same source as the single-day case, just asked for the range's last day. */
  periodClosing: Map<string, string>;
  products: ProductWithLocations[];
  locations: Location[];
  locationId?: string;
};

/**
 * Build one row per (product, location) summed over the whole period —
 * same `LedgerRow` shape `<DenseLedger>` already renders, so the Week/Month
 * view is the same frozen kit component as Today/Custom, just fed
 * differently. `flagged` marks a row whose non-sale outflow is unusually
 * large relative to its sold volume — a cheap heuristic to make the
 * outlier-scan case (the whole point of this view, see the header note)
 * visible without the caller doing its own pass over the rows.
 */
export function derivePeriodSummaryRows(input: DerivePeriodSummaryInput): {
  rows: PeriodSummaryRow[];
  totals: LedgerTotals;
} {
  const { movements, periodClosing, products, locations } = input;

  const productById = new Map(products.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const pairs = new Set<PeriodGroupKey>();
  for (const m of movements) {
    if (input.locationId && m.locationId !== input.locationId) continue;
    pairs.add(periodGroupKey(m.productId, m.locationId));
  }
  for (const key of periodClosing.keys()) {
    const [, loc] = key.split("@");
    if (input.locationId && loc !== input.locationId) continue;
    if (num(periodClosing.get(key) ?? "0") !== 0) pairs.add(key);
  }

  const sums = ZERO_SUMS();
  let totalOpening = 0;
  let totalClosing = 0;
  let totalSoldValue = 0;
  let totalClosingValue = 0;

  const rows: PeriodSummaryRow[] = [];

  for (const key of [...pairs].sort()) {
    const [productId, locationId] = key.split("@");
    const product = productById.get(productId);
    const location = locationById.get(locationId);

    const closing = num(periodClosing.get(key) ?? "0");
    const rowMovements = movements.filter(
      (m) => m.productId === productId && m.locationId === locationId,
    );

    const col: LedgerColumnSums = ZERO_SUMS();
    const correctedCols = new Set<string>();

    for (const m of rowMovements) {
      const target = COLUMN_FOR_TYPE[m.movementType];
      if (!target) continue;
      const q = num(m.quantity);
      const columnKey: keyof LedgerColumnSums =
        target === "transfer" ? (q >= 0 ? "transferIn" : "transferOut") : target;
      col[columnKey] += q;
      if (m.correctsMovementId) correctedCols.add(columnKey);
    }

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

    const costValue = costValueOf(product);
    const soldValue = Math.abs(col.sold) * costValue;
    const closingValue = closing * costValue;
    totalSoldValue += soldValue;
    totalClosingValue += closingValue;

    // Outlier heuristic: non-sale outflow at least a third of sold volume
    // (and non-trivial in absolute terms) is worth a glance — the exact
    // threshold is a display nicety, not a business rule; tune freely.
    const flagged = Math.abs(col.nonSale) >= 1 && Math.abs(col.nonSale) >= Math.abs(col.sold) * 0.3;

    rows.push({
      id: key,
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
      soldValue: valueCell(soldValue),
      closing: { value: closing.toFixed(1) },
      closingValue: valueCell(closingValue),
      flagged,
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
    soldValue: valueCell(totalSoldValue),
    closing: { value: totalClosing.toFixed(1) },
    closingValue: valueCell(totalClosingValue),
  };

  return { rows, totals };
}
