"use client";

// Mobile Stock Levels view — shared by /store-manager/stock and
// /canteen/stock (Session 12, ADR-44 — composed from the kit; artboards
// 986-0 / 9GW-0 superseded). NOT the Admin <DenseLedger> (desktop).
//
// Composition: <DenseSummaryStrip> (line-count + total-units totals) +
// <PillFilter> + a mobile card list (kit <Card>-style rows with a mono
// qty) + <EmptyState> / <EmptyState variant="filtered"> / <ErrorState>.
// Fed by useStockCard → GET /api/stock-movements (the day's rows) +
// GET /api/stock-movements/balances at the PRIOR business date (ADR-40).
// Each row is a stock card: opening (carried forward, derived — never
// stored) → the day's signed movement → closing. A product holding stock
// that didn't move today is still a row ("Open 40 · — · Close 40"), which
// is what a physical stock card shows and what the bare-balance version
// of this screen hid (owner report 2026-09-02).
//
// M2-3d: the filter pill set is a PROP (fidelity-audit-m1 §"Canteen —
// Stock levels" item 4 / flow doc §"Stock Levels"). The Store Manager
// keeps its kind-based `All · Ingredients · Goods · Dishes`; the Canteen
// passes `All · Beverages · Goods` — no dead "Dishes" pill (a Canteen
// holds sodas / goods / snacks). Because "Beverages" is not a
// `ProductKind`, each pill carries its own `match(product)` predicate
// rather than a single kind-equality filter; the SM pills just wrap
// kind-equality so SM behaviour is unchanged.

import * as React from "react";
import type { ProductKind } from "@prisma/client";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { DenseSummaryStrip } from "@/components/kit/dense-summary-strip";
import { PillFilter } from "@/components/kit/pill-filter";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { Spinner } from "@/components/kit/spinner";
import { useStockCard, stockApi } from "@/app/store-manager/use-staff-stock";
import { toBusinessDate } from "@/lib/time";
import { trimQty } from "@/app/store-manager/staff-stock-format";

/** One filter pill. `match` omitted ⇒ the "All" pill (matches every row). */
export type StockLevelsPill = {
  key: string;
  label: string;
  match?: (product: ProductWithLocations) => boolean;
};

const byKind =
  (k: ProductKind) =>
  (p: ProductWithLocations): boolean =>
    p.kind === k;

/**
 * The Store Manager pill set — the default. Kind-based, unchanged from the
 * pre-3d behaviour (`Dishes` is meaningful here: the SM stages cooked
 * dishes for the Restaurant).
 */
export const SM_STOCK_PILLS: StockLevelsPill[] = [
  { key: "all", label: "All" },
  { key: "ingredient", label: "Ingredients", match: byKind("ingredient") },
  { key: "goods", label: "Goods", match: byKind("goods") },
  { key: "dish", label: "Dishes", match: byKind("dish") },
];

/**
 * The Canteen pill set. "Beverages" ~ the product's `category` reads as a
 * drink (soda / beverage / drink); "Goods" is everything else the Canteen
 * carries. No "Dishes" pill — a Canteen holds no dishes.
 */
const BEVERAGE_RE = /bever|soda|drink|juice|water/i;
export const CANTEEN_STOCK_PILLS: StockLevelsPill[] = [
  { key: "all", label: "All" },
  {
    key: "beverages",
    label: "Beverages",
    match: (p) => !!p.category && BEVERAGE_RE.test(p.category),
  },
  {
    key: "goods",
    label: "Goods",
    match: (p) => !(p.category && BEVERAGE_RE.test(p.category)),
  },
];

export function StockLevelsView({
  locationLabel,
  locationType,
  pillSet = SM_STOCK_PILLS,
}: {
  locationLabel: string;
  locationType: "store" | "canteen";
  /** Filter pills for this view. Defaults to the SM (kind-based) set. */
  pillSet?: StockLevelsPill[];
}) {
  const [locationId, setLocationId] = React.useState<string | undefined>(
    undefined,
  );
  const [pillKey, setPillKey] = React.useState<string>(pillSet[0]?.key ?? "all");

  // Resolve this staff member's own locationId once (the list read is
  // scoped server-side; balances needs the id explicitly).
  React.useEffect(() => {
    let cancelled = false;
    void stockApi.listLocations().then((locs) => {
      if (cancelled) return;
      setLocationId(locs.find((l) => l.type === locationType)?.id);
    });
    return () => {
      cancelled = true;
    };
  }, [locationType]);

  // The day this card frames. `Africa/Nairobi` via lib/time — never
  // server-local (CLAUDE.md "day boundaries use the fixed constant").
  const businessDate = React.useMemo(() => toBusinessDate(new Date()), []);
  const { rows, loading, error, refresh } = useStockCard(
    locationId,
    businessDate,
  );
  const [productById, setProductById] = React.useState<
    Map<string, ProductWithLocations>
  >(new Map());

  React.useEffect(() => {
    let cancelled = false;
    void stockApi.listProducts().then((ps) => {
      if (cancelled) return;
      setProductById(new Map(ps.map((p) => [p.id, p])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activePill = pillSet.find((p) => p.key === pillKey) ?? pillSet[0];
  const filtered =
    !activePill?.match
      ? rows
      : rows.filter((r) => {
          const product = productById.get(r.productId);
          return product ? activePill.match!(product) : false;
        });

  // Totals read the day's CLOSING — what is on hand at the end of the
  // day being shown, which for today is "as of now".
  const totalUnits = filtered.reduce(
    (sum, r) => sum + Number.parseFloat(r.closing),
    0,
  );
  const movedCount = filtered.filter((r) => !r.resting).length;

  if (error) {
    return (
      <div className="flex flex-col gap-(--sp-5) p-(--sp-6)">
        <ErrorState
          title="Couldn't load stock levels"
          description="Check your connection and try again."
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-(--sp-5) p-(--sp-6)">
      <div className="flex flex-col gap-[2px]">
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-display/display">
          Stock Levels
        </div>
        <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          {locationLabel} · opening → today → closing
        </div>
      </div>

      <DenseSummaryStrip
        items={[
          { label: "Lines", value: String(filtered.length) },
          { label: "Moved", value: String(movedCount) },
          {
            label: "Total units",
            value: trimQty(String(totalUnits)),
            tone: totalUnits < 0 ? "danger" : "default",
            alignEnd: true,
          },
        ]}
        className="w-full"
      />

      <PillFilter
        aria-label="Filter by product kind"
        options={pillSet.map((p) => ({ key: p.key, label: p.label }))}
        activeKey={pillKey}
        onChange={setPillKey}
      />

      {loading ? (
        <div className="flex justify-center py-(--sp-10)">
          <Spinner label="Loading stock levels" />
        </div>
      ) : filtered.length === 0 && rows.length > 0 ? (
        <EmptyState
          variant="filtered"
          title="Nothing in this category"
          description="No products of this kind have stock at this location right now."
          actionLabel="Clear filter"
          onAction={() => setPillKey(pillSet[0]?.key ?? "all")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            locationType === "canteen"
              ? "No stock at the Canteen yet"
              : "No stock on hand"
          }
          description={
            locationType === "canteen"
              ? "Canteen stock will show here once the Store Manager transfers items in, or opening stock is set."
              : `Nothing has a derived balance at ${locationLabel} yet.`
          }
        />
      ) : (
        <ul className="flex flex-col list-none">
          {filtered.map((r, i) => {
            const closing = Number.parseFloat(r.closing);
            const moved = Number.parseFloat(r.movements);
            return (
              <li
                key={r.productId}
                className={
                  "flex flex-col gap-(--sp-2) py-(--sp-5)" +
                  (i < filtered.length - 1
                    ? " border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                    : "")
                }
              >
                <div className="flex items-center justify-between gap-(--sp-4)">
                  <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm truncate min-w-0">
                    {r.name}
                  </div>
                  <div
                    className={
                      "font-mono font-(--weight-semibold) shrink-0 text-sm/micro " +
                      (closing < 0 ? "text-danger" : "[color:var(--text-primary)]")
                    }
                  >
                    {trimQty(r.closing)} {r.unitLabel}
                  </div>
                </div>

                {/* The stock card: opening → the day's movement → closing.
                    A resting product (nothing moved today) still shows the
                    full line with a "—" in the middle, so the carried-
                    forward balance is legible rather than implied. */}
                <div className="flex items-center gap-(--sp-2) font-mono [color:var(--text-tertiary)] text-caption/micro">
                  <span>Open {trimQty(r.opening)}</span>
                  <span aria-hidden="true">·</span>
                  {r.resting ? (
                    <span>—</span>
                  ) : (
                    <span
                      className={moved < 0 ? "text-danger" : "text-success"}
                    >
                      {moved > 0 ? `+${trimQty(r.movements)}` : trimQty(r.movements)}
                    </span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Close {trimQty(r.closing)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{r.unitLabel}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
