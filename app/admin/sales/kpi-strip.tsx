"use client";

// Sales KPI strip — client feedback 2026-09-17: "some stats or a KPI strip
// on the Sales page", covering both Restaurant Orders and Canteen Derived.
//
// Adapted from `app/admin/financials/kpi-strip.tsx` (the house pattern for
// a dense, hairline-split tile row — design-principles.md §"Stat Tiles &
// KPI", 6R4-0). Two differences from the Financials strip, both
// deliberate:
//
//   - Purely informational, not a tab switcher (Financials' strip doubles
//     as its 6-tab control; Sales only has two tabs and the existing
//     <Tabs> row already does that job — a second control for the same
//     switch would be redundant).
//   - A `SegmentedControl` (All / Restaurant / Canteen) picks which
//     figures the strip shows, independent of which tab's TABLE is open
//     below. The owner wants a combined total across both sides of the
//     business as well as each side's own figures, and the Orders/Derived
//     tabs can't express that (Canteen has no "order" and Restaurant has
//     no "derived sale") — so scope is its own axis, not tied to the tab.
//
// Figures are summed over the page-level date range (from..to), computed
// client-side from the same `orders` / `derivedRows` arrays the two tabs
// already hold in memory — no new endpoint; row counts here are small
// (a single business's daily orders / canteen product list), matching how
// the tabs themselves already fetch and reduce client-side.
//
// Owner sale adjustments (ADR-92) — the Admin's Sold edits from the stock
// ledger — are revenue too, so each side's total folds its own
// adjustments in (by the adjustment's location type), with a caption
// saying how much. The Cash / M-Pesa / Credit tiles stay "orders by
// payment method" and deliberately exclude them.

import * as React from "react";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { ErrorState } from "@/components/kit/error-state";
import type { OrderView, DerivedSaleView, SaleAdjustmentView } from "@/lib/domain/sales";

export type SalesKpiScope = "all" | "restaurant" | "canteen";

const SCOPE_LABEL: Record<SalesKpiScope, string> = {
  all: "All",
  restaurant: "Restaurant",
  canteen: "Canteen",
};
const LABEL_TO_SCOPE: Record<string, SalesKpiScope> = {
  All: "all",
  Restaurant: "restaurant",
  Canteen: "canteen",
};
const SCOPE_OPTIONS = [SCOPE_LABEL.all, SCOPE_LABEL.restaurant, SCOPE_LABEL.canteen];

function money(n: number): string {
  return `KES ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Tile = { label: string; figure: string; caption: string };

type AdjustmentSums = { revenue: number; units: number; count: number };

function sumAdjustments(
  adjustments: SaleAdjustmentView[],
  side: "restaurant" | "canteen",
): AdjustmentSums {
  const own = adjustments.filter((a) => a.locationType === side);
  return {
    revenue: own.reduce((sum, a) => sum + Number(a.revenue), 0),
    units: own.reduce((sum, a) => sum + Number(a.unitsSold), 0),
    count: own.length,
  };
}

/** "incl. KES 225.00 adjustments" — blank when there are none. */
function adjCaption(adj: AdjustmentSums, prefix = ""): string {
  if (adj.count === 0) return prefix || " ";
  const sign = adj.revenue < 0 ? "−" : "";
  const text = `incl. ${sign}${money(Math.abs(adj.revenue))} adjustments`;
  return prefix ? `${prefix} · ${text}` : text;
}

/** Restaurant Orders figures, summed over whatever rows are passed in (the
 *  page-level date range already narrows them — same convention as the
 *  Financials KPIs summing over `from..to`). */
function restaurantTiles(orders: OrderView[], adj: AdjustmentSums): Tile[] {
  const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0) + adj.revenue;
  const byMethod = { cash: 0, mpesa: 0, credit: 0 };
  for (const o of orders) byMethod[o.paymentMethod] += Number(o.total);
  const corrections = orders.filter((o) => o.correctsOrderId !== null).length;

  return [
    {
      label: "Total Sales",
      figure: money(totalSales),
      caption: adjCaption(adj, `${orders.length} orders`),
    },
    { label: "Orders", figure: orders.length.toLocaleString("en-US"), caption: " " },
    { label: "Cash", figure: money(byMethod.cash), caption: " " },
    { label: "M-Pesa", figure: money(byMethod.mpesa), caption: " " },
    {
      label: "Credit",
      figure: money(byMethod.credit),
      caption: corrections > 0 ? `${corrections} corrected` : " ",
    },
  ];
}

/** Canteen Derived figures — one row per product, `null` figures for a
 *  never-counted product excluded from the sums (nothing to add). */
function canteenTiles(rows: DerivedSaleView[], adj: AdjustmentSums): Tile[] {
  const counted = rows.filter((r) => r.unitsSold != null);
  const totalRevenue = counted.reduce((sum, r) => sum + Number(r.revenue), 0) + adj.revenue;
  const totalUnits = counted.reduce((sum, r) => sum + Number(r.unitsSold), 0) + adj.units;

  return [
    {
      label: "Total Revenue",
      figure: money(totalRevenue),
      caption: adjCaption(adj, `${counted.length} products`),
    },
    {
      label: "Units Sold",
      figure: totalUnits.toLocaleString("en-US"),
      caption: adj.count > 0 ? "incl. adjustments" : " ",
    },
    { label: "Products Counted", figure: counted.length.toLocaleString("en-US"), caption: `of ${rows.length}` },
  ];
}

function combinedTiles(
  orders: OrderView[],
  rows: DerivedSaleView[],
  restaurantAdj: AdjustmentSums,
  canteenAdj: AdjustmentSums,
): Tile[] {
  const restaurantSales =
    orders.reduce((sum, o) => sum + Number(o.total), 0) + restaurantAdj.revenue;
  const canteenRevenue =
    rows.filter((r) => r.revenue != null).reduce((sum, r) => sum + Number(r.revenue), 0) +
    canteenAdj.revenue;
  const bothAdj: AdjustmentSums = {
    revenue: restaurantAdj.revenue + canteenAdj.revenue,
    units: restaurantAdj.units + canteenAdj.units,
    count: restaurantAdj.count + canteenAdj.count,
  };

  return [
    {
      label: "Total Sales Revenue",
      figure: money(restaurantSales + canteenRevenue),
      caption: adjCaption(bothAdj, "Restaurant + Canteen"),
    },
    {
      label: "Restaurant Sales",
      figure: money(restaurantSales),
      caption: adjCaption(restaurantAdj, `${orders.length} orders`),
    },
    { label: "Canteen Revenue", figure: money(canteenRevenue), caption: adjCaption(canteenAdj) },
    { label: "Orders", figure: orders.length.toLocaleString("en-US"), caption: " " },
  ];
}

const LABEL =
  "font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] text-micro/micro [color:var(--text-tertiary)]";
const FIGURE =
  "font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[20px]";
const CAPTION =
  "font-ui font-(--weight-regular) [color:var(--text-disabled)] text-micro/[14px]";

function TileCell({ tile, mobile }: { tile: Tile; mobile?: boolean }) {
  return (
    <div
      className={`flex flex-col grow basis-0 min-w-0 ${
        mobile ? "gap-[3px] py-[12px] px-[14px]" : "gap-[4px] py-[14px] px-[18px]"
      } border-r border-r-solid [border-right-color:var(--border-subtle)] last:border-r-0`}
    >
      <span className={LABEL}>{tile.label}</span>
      <span className={`${FIGURE} truncate`}>{tile.figure}</span>
      <span className={`${CAPTION} truncate`}>{tile.caption}</span>
    </div>
  );
}

export function SalesKpiStrip({
  scope,
  onScopeChange,
  orders,
  derivedRows,
  adjustments = [],
  caption,
  error,
  onRetry,
}: {
  scope: SalesKpiScope;
  onScopeChange: (scope: SalesKpiScope) => void;
  orders: OrderView[];
  derivedRows: DerivedSaleView[];
  /** Owner sale adjustments in the same range (ADR-92). */
  adjustments?: SaleAdjustmentView[];
  /** e.g. "This week at a glance". */
  caption: string;
  error?: string | null;
  onRetry?: () => void;
}) {
  const tiles = React.useMemo(() => {
    const restaurantAdj = sumAdjustments(adjustments, "restaurant");
    const canteenAdj = sumAdjustments(adjustments, "canteen");
    if (scope === "restaurant") return restaurantTiles(orders, restaurantAdj);
    if (scope === "canteen") return canteenTiles(derivedRows, canteenAdj);
    return combinedTiles(orders, derivedRows, restaurantAdj, canteenAdj);
  }, [scope, orders, derivedRows, adjustments]);

  const row =
    "flex w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]";

  return (
    <section className="flex flex-col w-full gap-(--sp-3)">
      <div className="flex items-center justify-between gap-(--sp-4)">
        <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.06em] [color:var(--text-tertiary)] text-micro/[14px]">
          {caption}
        </span>
        <SegmentedControl
          aria-label="Sales KPI scope"
          options={SCOPE_OPTIONS}
          value={SCOPE_LABEL[scope]}
          onChange={(label) => onScopeChange(LABEL_TO_SCOPE[label])}
        />
      </div>

      {error ? (
        <ErrorState
          title="Couldn't load the period figures"
          description={error}
          onRetry={onRetry}
        />
      ) : (
        <>
          {/* Desktop — one row. */}
          <div className={`hidden md:flex ${row}`}>
            {tiles.map((t) => (
              <TileCell key={t.label} tile={t} />
            ))}
          </div>

          {/* Mobile — wraps to a 2-col grid so a 5-tile Restaurant row and a
              3-tile Canteen row both read cleanly at 390px. */}
          <div
            className={`md:hidden grid grid-cols-2 w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]`}
          >
            {tiles.map((t, i) => (
              <div
                key={t.label}
                className={[
                  i % 2 === 1
                    ? "border-l border-l-solid [border-left-color:var(--border-subtle)]"
                    : "",
                  i < tiles.length - (tiles.length % 2 === 0 ? 2 : 1)
                    ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <TileCell tile={t} mobile />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
