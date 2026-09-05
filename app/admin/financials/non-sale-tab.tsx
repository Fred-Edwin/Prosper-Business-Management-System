"use client";

// M5 v2 Session C — the Non-Sale Consumption tab, the 6th transaction tab
// on /admin/financials. Paper `Financials — desktop [v2]` (Non-Sale
// Table) / `Financials — mobile [v2]`. Spec: financials-screen.md
// "Structure (v2 — current)" §4.
//
// This tab REPLACES the old "Where unsold stock went" panel (a
// summed-by-reason block inside the profit report, which left this screen
// with COGS). Rows beat a total: the owner can now see which product,
// which day, whose write-off — not just an aggregate.
//
// Pure read-wiring — no new domain or schema work (v2 spec). The movement
// rows carry productId / locationId / quantity / reason / recordedById /
// occurredAt; `Recorded by` and `Est. cost` are resolved CLIENT-SIDE, the
// same way every other tab resolves its own columns.
//
// ── Est. cost, and why it is computed here ──────────────────────────────
// `computeNonSaleCost` (lib/domain/financials/get-financial-summary.ts) is
// a private module function returning a by-REASON aggregate — there is no
// exported per-row valuation to call, and it is server-only anyway
// (Prisma.Decimal + process.env). So the per-row figure is applied here
// from the SAME ADR-55 rule, with the percentage taken off the wire
// (`nonSaleConsumption.dishWasteCostPercent`) rather than re-declared:
//     ingredient / goods → buyingPrice
//     dish               → dishWasteCostPercent × sellingPrice
// The tab's TOTAL is never summed from these rows — it is the
// server-computed `nonSaleConsumption.total`, so the toolbar figure stays
// authoritative even where a row's price lookup is incomplete.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { NonSaleReason, StockMovementView } from "@/lib/domain/stock";
import type { StaffView } from "@/lib/domain/staff";
import { useNonSaleConsumption } from "./use-financials";
import { NonSaleDrawer } from "./non-sale-drawer";

// ── labels + the reason pill ────────────────────────────────────────────

const REASON_LABEL: Record<string, string> = {
  staff_meal: "Staff meal",
  complimentary: "Complimentary",
  spoiled: "Spoiled",
  damaged: "Damaged",
  other: "Other",
};

/**
 * Reason pill tones — semantic tokens only, no new colours (spec §4):
 * Spoiled → danger; Complimentary → info; Staff meal / Damaged / Other →
 * neutral.
 */
const REASON_TONE: Record<string, string> = {
  spoiled: "[color:var(--color-danger)] [background-color:var(--color-danger-bg)]",
  complimentary: "[color:var(--color-info)] [background-color:var(--color-info-bg)]",
  staff_meal: "[color:var(--text-secondary)] [background-color:var(--surface-subtle)]",
  damaged: "[color:var(--text-secondary)] [background-color:var(--surface-subtle)]",
  other: "[color:var(--text-secondary)] [background-color:var(--surface-subtle)]",
};

function ReasonPill({ reason }: { reason: NonSaleReason | null }) {
  const key = reason ?? "other";
  return (
    <span
      className={`inline-block py-[3px] px-[8px] rounded-full font-ui font-(--weight-semibold) text-micro/[14px] ${
        REASON_TONE[key] ?? REASON_TONE.other
      }`}
    >
      {REASON_LABEL[key] ?? key}
    </span>
  );
}

// ── format helpers ──────────────────────────────────────────────────────

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/** "Sep 4" — the mobile caption's shorter form. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

function trimQty(dec: string): string {
  const n = Math.abs(Number(dec));
  if (!Number.isFinite(n)) return dec;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * One row's estimated cost, per ADR-55. `dishWasteCostPercent` comes from
 * the summary response — never re-declared here. Returns `null` when the
 * price the rule needs isn't available, so the cell can show "—" rather
 * than a confidently wrong 0.00.
 */
export function rowCost(
  movement: StockMovementView,
  product: ProductWithLocations | undefined,
  dishWasteCostPercent: string | null,
): number | null {
  if (!product) return null;
  const units = Math.abs(Number(movement.quantity));
  if (!Number.isFinite(units)) return null;

  if (product.kind === "dish") {
    if (dishWasteCostPercent == null) return null;
    // Dishes are sold at the Restaurant; take the first priced location,
    // matching computeNonSaleCost's own `.find(p => p != null)`.
    const priced = product.locations.find((l) => l.sellingPrice != null);
    if (!priced?.sellingPrice) return null;
    return units * Number(priced.sellingPrice) * Number(dishWasteCostPercent);
  }
  if (product.buyingPrice == null) return null;
  return units * Number(product.buyingPrice);
}

// ── column lanes (exact flex ratios from the artboard) ──────────────────

const C_DATE = "grow-[0.9] basis-0 min-w-0";
const C_PRODUCT = "grow-[1.3] basis-0 min-w-0";
const C_LOCATION = "grow basis-0 min-w-0";
const C_QTY = "grow-[0.7] basis-0 min-w-0 text-right pr-[16px]";
const C_REASON = "grow-[1.1] basis-0 min-w-0";
const C_BY = "grow-[1.2] basis-0 min-w-0";
const C_COST = "grow-[0.9] basis-0 min-w-0 text-right";
const HEAD =
  "font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/[14px]";

export function NonSaleView({
  from,
  to,
  periodLabel,
  total,
  dishWasteCostPercent,
  registerRecordNonSale,
  onMutated,
}: {
  /** Inclusive `YYYY-MM-DD` business-date range from the header control. */
  from: string;
  to: string;
  /** e.g. "this month" — the toolbar count line's period noun. */
  periodLabel: string;
  /** `nonSaleConsumption.total` — server-computed, authoritative. */
  total: string | null;
  /** `nonSaleConsumption.dishWasteCostPercent` (ADR-55), off the wire. */
  dishWasteCostPercent: string | null;
  /** Lets the header host the tab's primary action. */
  registerRecordNonSale?: (fn: () => void) => void;
  /** Called after a write so the shell refreshes the summary + KPI strip. */
  onMutated: () => void;
}) {
  const {
    movements,
    products,
    locations,
    staff,
    loading,
    error,
    refresh,
  } = useNonSaleConsumption(from, to);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const openDrawer = React.useCallback(() => setDrawerOpen(true), []);

  React.useEffect(() => {
    registerRecordNonSale?.(openDrawer);
  }, [registerRecordNonSale, openDrawer]);

  const productById = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const locationById = React.useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );
  /**
   * `recordedById` is a **User** id; `StaffView.userId` is the link back.
   * A User with no Staff row (e.g. the Admin's own login) won't resolve —
   * that's shown as "—", never guessed.
   */
  const staffByUserId = React.useMemo(
    () =>
      new Map(
        staff
          .filter((s): s is StaffView & { userId: string } => s.userId != null)
          .map((s) => [s.userId, s]),
      ),
    [staff],
  );

  const rows = React.useMemo(
    () =>
      movements.map((m) => {
        const product = productById.get(m.productId);
        const cost = rowCost(m, product, dishWasteCostPercent);
        return {
          movement: m,
          productName: product?.name ?? "—",
          locationName: locationById.get(m.locationId)?.name ?? "—",
          recordedBy: staffByUserId.get(m.recordedById)?.name ?? "—",
          qty: trimQty(m.quantity),
          cost,
        };
      }),
    [movements, productById, locationById, staffByUserId, dishWasteCostPercent],
  );

  const handleCreated = React.useCallback(async () => {
    await refresh();
    onMutated();
  }, [refresh, onMutated]);

  return (
    <div className="flex flex-col grow px-(--sp-6) md:px-0 pt-(--sp-6) pb-(--sp-12)">
      {/* Toolbar — count line + primary action. */}
      <div className="flex items-center justify-between gap-(--sp-4) mb-(--sp-4)">
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {rows.length} write-off{rows.length === 1 ? "" : "s"} {periodLabel}
          {total != null ? ` · KES ${money(Number(total))}` : ""}
        </span>
        <Button variant="secondary" onClick={openDrawer}>
          Record Non-Sale Use
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="Couldn't load non-sale consumption"
          description={error}
          onRetry={refresh}
        />
      ) : (
        <>
          {/* Desktop table — headers stay visible even when empty
              (the Stock Purchases pattern, spec's Zone 2 rule). */}
          <div className="hidden md:flex flex-col w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)]">
            <div className="flex items-center w-full py-[8px] px-[20px] [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <span className={`${C_DATE} ${HEAD}`}>Date</span>
              <span className={`${C_PRODUCT} ${HEAD}`}>Product</span>
              <span className={`${C_LOCATION} ${HEAD}`}>Location</span>
              <span className={`${C_QTY} ${HEAD}`}>Qty</span>
              <span className={`${C_REASON} ${HEAD}`}>Reason</span>
              <span className={`${C_BY} ${HEAD}`}>Recorded by</span>
              <span className={`${C_COST} ${HEAD}`}>Est. cost</span>
            </div>
            {loading && rows.length === 0 ? (
              <div className="p-(--sp-6)">
                <div className="kit-skeleton h-[96px] w-full rounded-md" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-(--sp-6)">
                <EmptyState
                  title="No non-sale use recorded"
                  description={`Nothing was written off ${periodLabel}. Spoilage, staff meals and complimentary items recorded by any staff member appear here.`}
                />
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.movement.id}
                  className="flex items-center w-full py-[12px] px-[20px] border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
                >
                  <span
                    className={`${C_DATE} font-ui [color:var(--text-tertiary)] text-caption/[16px]`}
                  >
                    {fmtDate(r.movement.occurredAt)}
                  </span>
                  <span
                    className={`${C_PRODUCT} font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm truncate`}
                  >
                    {r.productName}
                  </span>
                  <span
                    className={`${C_LOCATION} font-ui [color:var(--text-secondary)] text-sm/sm truncate`}
                  >
                    {r.locationName}
                  </span>
                  <span
                    className={`${C_QTY} font-mono [color:var(--text-primary)] text-sm/sm`}
                  >
                    {r.qty}
                  </span>
                  <span className={C_REASON}>
                    <ReasonPill reason={r.movement.reason} />
                  </span>
                  <span
                    className={`${C_BY} font-ui [color:var(--text-secondary)] text-sm/sm truncate`}
                  >
                    {r.recordedBy}
                  </span>
                  <span
                    className={`${C_COST} font-mono [color:var(--text-primary)] text-sm/sm`}
                  >
                    {r.cost != null ? money(r.cost) : "—"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Mobile — stacked cards: product + cost on line 1, the reason
              pill + "<location> · <qty> units · <by> · <date>" below. */}
          <div className="md:hidden flex flex-col w-full">
            {loading && rows.length === 0 ? (
              <div className="kit-skeleton h-[120px] w-full rounded-md" />
            ) : rows.length === 0 ? (
              <EmptyState
                title="No non-sale use recorded"
                description={`Nothing was written off ${periodLabel}.`}
              />
            ) : (
              rows.map((r) => (
                <div
                  key={r.movement.id}
                  className="flex flex-col w-full gap-[5px] py-[12px] border-t border-t-solid [border-top-color:var(--border-subtle)]"
                >
                  <div className="flex items-center justify-between gap-(--sp-4)">
                    <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm truncate">
                      {r.productName}
                    </span>
                    <span className="font-mono [color:var(--text-primary)] text-sm/sm shrink-0">
                      {r.cost != null ? money(r.cost) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-[6px] min-w-0">
                    <ReasonPill reason={r.movement.reason} />
                    <span className="font-ui [color:var(--text-tertiary)] text-caption/[16px] truncate">
                      {r.locationName} · {r.qty} units · {r.recordedBy} ·{" "}
                      {shortDate(r.movement.occurredAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {drawerOpen && (
        <NonSaleDrawer
          products={products}
          locations={locations}
          onClose={() => setDrawerOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
