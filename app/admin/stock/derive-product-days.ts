// Pure day-by-day derivation for the period-summary's "View days →"
// drill-in (one product × location, across a `from..to` range). Reuses the
// exact same per-day backward-walk rule as `deriveLedgerRows` (ADR-11) —
// each day's Closing is that day's own derived balance, and Opening is
// walked back from it — just run once per day in the range instead of once
// for the whole page.
//
// Deliberately NOT a generalization of `deriveLedgerRows` (which derives
// many product/location rows for one day) — this derives many DAYS for one
// fixed product/location, a different axis, so sharing a function would
// need a confusing "which dimension is the loop" parameter. Small enough to
// duplicate the arithmetic; COLUMN_FOR_TYPE stays a single source (imported).

import type { LedgerRow, LedgerCell } from "@/components/kit/dense-ledger";
import type { MovementType, StockMovementView } from "@/lib/domain/stock";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { addBusinessDays } from "@/lib/time";

const DASH: LedgerCell = { dash: true };

type ColumnRoute = keyof LedgerColumnSums | "transfer" | null;

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

/** One day's row for the drill-in table — same cell shape as LedgerRow, `product`/`location`/`id` repurposed to carry the day label. */
export type ProductDayRow = Omit<LedgerRow, "product" | "location"> & {
  /** `YYYY-MM-DD` business date this row covers. */
  businessDate: string;
};

export type DeriveProductDaysInput = {
  /** Every movement for this ONE product/location across the whole `from..to` range. */
  movements: StockMovementView[];
  from: string;
  to: string;
  /** Each day's closing balance, keyed by `YYYY-MM-DD` — from `balances(asOf: day)` called once per day, or a single batched read the caller assembles. */
  closingByDay: Map<string, string>;
  product: ProductWithLocations | undefined;
};

/**
 * One row per business day in `[from, to]` inclusive, oldest first — the
 * period-summary's drill-in table for a single product/location.
 */
export function deriveProductDayRows(input: DeriveProductDaysInput): ProductDayRow[] {
  const { movements, from, to, closingByDay, product } = input;
  const costValue = costValueOf(product);

  const days: string[] = [];
  for (let d = from; d <= to; d = addBusinessDays(d, 1)) days.push(d);

  return days.map((day) => {
    const closing = num(closingByDay.get(day) ?? "0");
    const dayMovements = movements.filter((m) => m.occurredAt.slice(0, 10) === day);

    const col = ZERO_SUMS();
    const correctedCols = new Set<string>();
    for (const m of dayMovements) {
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

    const soldValue = Math.abs(col.sold) * costValue;
    const closingValue = closing * costValue;

    return {
      id: day,
      businessDate: day,
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
    };
  });
}
