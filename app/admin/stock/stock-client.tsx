// Wired from:
//   docs/design/screens/admin-stock-ledger-full-width/page.tsx      (798-0) — desktop ledger
//   docs/design/screens/admin-stock-ledger-drawer-open/page.tsx     (7LJ-0) — correction drawer state
//   docs/design/screens/admin-stock-mobile/page.tsx                 (8Q4-0) — mobile summary cards
//
// The -sidebar-collapsed skeleton (7G9-0) is a state of AdminShell, not this
// screen — its "Maximize" toggle drives the shell `collapsed` prop, wired in
// app/admin/admin-shell-client.tsx (ADR-36b: persisted app-wide).
//
// The exported skeletons bundle their own sidebar for standalone /design-preview
// use; app/admin/layout.tsx already wraps every admin route in <AdminShell>, so
// this file renders the CONTENT REGION only (toolbar row + filter row + ledger /
// mobile cards) — same call Session 5 made for catalog. The /design-preview
// copies stay as the frozen visual-regression reference.
//
// Markup + classes are verbatim from the skeletons. This file adds: date +
// location-tab state, the fetch (useLedger), the derived 11 columns
// (deriveLedgerRows), and the correction-drawer orchestration.
"use client";

import * as React from "react";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { PillFilter } from "@/components/kit/pill-filter";
import { toBusinessDate } from "@/lib/time";
import type { StockMovementView, MovementType } from "@/lib/domain/stock";
import { useLedger } from "./use-stock";
import { deriveLedgerRows } from "./derive-ledger";
import { CorrectionDrawer, type CorrectionTarget } from "./correction-drawer";

// Human labels for the ledger's movement columns (correction-drawer field label).
const COLUMN_LABEL: Record<string, string> = {
  purchases: "Purchase (+)",
  issues: "Kitchen Issue (-)",
  production: "Production (+)",
  transferIn: "Transfer In (+)",
  transferOut: "Transfer Out (-)",
  sold: "Sold (-)",
};

// Columns that can be corrected (a movement sits behind them). opening/closing
// are derived; the *Value columns are cosmetic.
const CORRECTABLE = new Set(Object.keys(COLUMN_LABEL));

function shortDate(businessDate: string): string {
  // "2026-08-24" -> "Aug 24"
  const d = new Date(`${businessDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function unitOf(productLabel: string): string {
  const m = productLabel.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : "units";
}

export function StockClient() {
  const today = toBusinessDate(new Date());
  const [date, setDate] = React.useState(today);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [drawerTarget, setDrawerTarget] = React.useState<CorrectionTarget | null>(
    null,
  );
  const [cellNote, setCellNote] = React.useState<string | null>(null);

  const { data, loading, error, refresh } = useLedger(
    date,
    activeTab === "all" ? undefined : activeTab,
  );

  // Location pill-tabs: "All (n)" + one per location, keyed by location id.
  const locationTabs = React.useMemo(
    () => [
      { key: "all", label: `All (${data.locations.length})` },
      ...data.locations.map((l) => ({ key: l.id, label: l.name })),
    ],
    [data.locations],
  );

  const { rows, totals, cellMovements } = React.useMemo(
    () =>
      deriveLedgerRows({
        movements: data.movements,
        priorClosing: data.priorClosing,
        products: data.products,
        locations: data.locations,
        locationId: activeTab === "all" ? undefined : activeTab,
      }),
    [data, activeTab],
  );

  function onCellClick(rowId: string, columnKey: string) {
    setCellNote(null);
    if (!CORRECTABLE.has(columnKey)) return;
    const ids = cellMovements.get(rowId)?.[columnKey] ?? [];
    if (ids.length === 0) return;
    if (ids.length > 1) {
      // FLAG (Session 7 wrap-up): a ledger aggregate cell backed by >1
      // movement has no approved correction affordance. correctMovement
      // needs one movementId; the drawer shows one editable field. Picking
      // among rows behind an aggregate is a design-sprint question.
      setCellNote(
        `${ids.length} separate entries are behind this cell. Correcting one of several isn't designed yet — flagged for a design sprint.`,
      );
      return;
    }
    const movement = data.movements.find((m) => m.id === ids[0]);
    if (!movement) return;

    const [productId, locationId] = rowId.split("@");
    const product = data.products.find((p) => p.id === productId);
    const location = data.locations.find((l) => l.id === locationId);
    const productLabel = product
      ? `${product.name} (${product.unitLabel})`
      : productId;

    setDrawerTarget({
      movement,
      subtitle: `${location?.name ?? locationId} · ${productLabel} · ${shortDate(
        date,
      )}`,
      fieldLabel: COLUMN_LABEL[columnKey] ?? columnKey,
      unit: product?.unitLabel ?? unitOf(productLabel),
    });
  }

  return (
    <>
      {/* ───────── Desktop ledger (798-0 content region) ───────── */}
      <div className="hidden md:flex flex-col grow min-w-[0px] self-stretch max-w-[1200px] w-[1200px] overflow-clip">
        {/* Toolbar */}
        <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
            Stock &amp; Reconciliation
          </div>
          <div className="grow" />
          <div className="flex items-center shrink-0 gap-(--sp-4)">
            <label className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm gap-(--sp-5) shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring">
              <span className="font-ui inline-block shrink-0 w-max [color:var(--text-primary)] text-body/body">
                Date: {shortDate(date)}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                aria-label="Business date"
                className="w-[16px] bg-transparent outline-none [color:transparent] [color-scheme:dark]"
              />
              <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                <line x1="16" y1="2" x2="16" y2="6" stroke="var(--text-secondary)" strokeWidth="1.5" />
                <line x1="8" y1="2" x2="8" y2="6" stroke="var(--text-secondary)" strokeWidth="1.5" />
                <line x1="3" y1="10" x2="21" y2="10" stroke="var(--text-secondary)" strokeWidth="1.5" />
              </svg>
            </label>
            <a
              href="/admin/stock/opening"
              className="flex items-center h-[36px] px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
            >
              <span className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-body/body">
                Opening Stock
              </span>
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) min-w-[0px] max-w-[1200px] w-[1200px] overflow-clip">
          {/* Filter row */}
          <div className="flex items-center justify-between [width:100%] shrink-0 max-w-full">
            <PillFilter
              options={locationTabs}
              activeKey={activeTab}
              onChange={setActiveTab}
              className="gap-(--sp-3)"
            />
          </div>

          {error && (
            <div className="font-ui text-danger text-body/sm">{error}</div>
          )}
          {cellNote && (
            <div className="font-ui text-warning text-body/sm">{cellNote}</div>
          )}

          {/* Ledger table (kit DenseLedger, Location column + horizontal scroll) */}
          <div className="[width:100%] max-w-full overflow-x-auto">
            <DenseLedger
              rows={rows}
              totals={rows.length > 0 ? totals : undefined}
              showLocation
              horizontalScroll
              emptyMessage={
                loading ? "Loading…" : "No stock movements for this day."
              }
              onCellClick={onCellClick}
            />
          </div>
        </div>
      </div>

      {/* ───────── Mobile (8Q4-0 content region) ───────── */}
      <div className="flex md:hidden flex-col grow overflow-clip gap-(--sp-5) bg-(--surface-page)">
        {/* Location pills */}
        <div className="flex items-center [width:100%] px-(--sp-6) pt-(--sp-5) overflow-x-auto gap-(--sp-3)">
          {locationTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center h-[32px] shrink-0 px-(--sp-6) rounded-lg kit-focus-ring ${
                  isActive ? "bg-(--surface-selected)" : ""
                }`}
              >
                <span
                  className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-body/sm ${
                    isActive ? "text-accent" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="px-(--sp-6) font-ui text-danger text-body/sm">{error}</div>
        )}
        {cellNote && (
          <div className="px-(--sp-6) font-ui text-warning text-body/sm">{cellNote}</div>
        )}

        {loading && rows.length === 0 ? (
          <div className="px-(--sp-6) font-ui [color:var(--text-tertiary)] text-body/sm">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-(--sp-6) font-ui [color:var(--text-tertiary)] text-body/sm">
            No stock movements for this day.
          </div>
        ) : (
          rows.map((row) => {
            const perCell = cellMovements.get(row.id) ?? {};
            const movementChips = (
              ["purchases", "issues", "production", "transferIn", "transferOut", "sold"] as const
            )
              .filter((k) => !row[k].dash)
              .map((k) => ({
                key: k,
                text: `${row[k].value} ${COLUMN_LABEL[k]?.replace(/ \(.\)$/, "") ?? k}`,
                tone: row[k].tone === "success" ? "success" : "danger",
                corrected: !!row[k].corrected,
                columnKey: k as string,
              }));
            return (
              <div
                key={row.id}
                className="flex flex-col [width:100%] py-(--sp-4) px-(--sp-6) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-start justify-between [width:100%]">
                  <div className="flex items-center gap-(--sp-3)">
                    <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 [color:var(--text-primary)] text-h2/h2">
                      {row.product}
                    </div>
                    <div className="font-ui inline-block px-(--sp-3) rounded-sm [background-color:var(--surface-subtle)]">
                      <div className="inline-block font-ui w-max [color:var(--text-secondary)] text-caption/micro">
                        {row.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-[2px]">
                    <div className="font-mono font-(--weight-semibold) inline-block w-max [color:var(--text-primary)] text-h2/body">
                      {row.closing.value}
                    </div>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-(--sp-4)">
                  {movementChips.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => onCellClick(row.id, m.columnKey)}
                      className={`font-mono inline-block w-max shrink-0 text-sm/micro kit-focus-ring ${
                        m.tone === "success" ? "text-success" : "text-danger"
                      } ${
                        m.corrected
                          ? "[text-underline-position:from-font] [text-decoration:underline_1px]"
                          : ""
                      }`}
                    >
                      {m.text}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between [width:100%]">
                  <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
                    Open: {row.opening.value}
                  </div>
                  <a
                    href="/admin/stock/opening"
                    className="flex items-center justify-center h-[32px] px-(--sp-5) rounded-sm [background-color:var(--surface-subtle)] kit-focus-ring"
                  >
                    <span className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-sm/micro">
                      Opening Stock
                    </span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {drawerTarget && (
        <CorrectionDrawer
          target={drawerTarget}
          onClose={() => setDrawerTarget(null)}
          onCorrected={refresh}
        />
      )}
    </>
  );
}
