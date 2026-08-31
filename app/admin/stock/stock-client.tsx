// Session 11 rebuild — COMPOSED from the kit, no longer a transcription of Paper
// artboards 798-0 (desktop ledger) / 7LJ-0 (correction drawer) / 8Q4-0 (mobile).
// Assembled from <PageShell wide> + <PillFilter> + <DatePicker> (real-calendar
// selected/onSelect) + <DenseLedger showLocation horizontalScroll onCellClick
// loading> + <EmptyState variant="filtered"> / <ErrorState> + the rail <Drawer>
// correction flow + <Toast>.
//
// The data path is unchanged: date + location-tab state, useLedger, the derived
// 11 columns via deriveLedgerRows, the >1-movement-per-cell FLAG, and the
// correction-drawer orchestration are verbatim. The shell "Maximize" collapse is
// AdminShell's `collapsed` prop (admin-shell-client.tsx, ADR-36b), not this file.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { PillFilter } from "@/components/kit/pill-filter";
import { DatePicker } from "@/components/kit/date-picker";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { Button } from "@/components/kit/button";
import { toBusinessDate } from "@/lib/time";
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

// Short chip labels for the mobile stacked-row deltas — aligned to artboard
// 8Q4-0 (`+50.0 Purch`  `-18.5 Issue`  `-10.0 Tr Out`  `+40.0 Prod`  `+5.0 Tr In`
// `-38.0 Sold`), per fidelity-audit-m1.md §"Admin Stock — Ledger mobile" item 4.
const MOBILE_CHIP_LABEL: Record<string, string> = {
  purchases: "Purch",
  issues: "Issue",
  production: "Prod",
  transferIn: "Tr In",
  transferOut: "Tr Out",
  sold: "Sold",
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

function longDate(businessDate: string): string {
  const d = new Date(`${businessDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

  // Mobile per-row "Adjust" (artboard 8Q4-0): open the correction drawer for
  // the row. A row usually has one correctable movement behind one column; if
  // it has exactly one, open it directly, otherwise fall back to the same
  // "pick a chip" guidance the multi-entry cell shows.
  function onAdjustRow(rowId: string) {
    setCellNote(null);
    const byColumn = cellMovements.get(rowId) ?? {};
    const withMovements = (Object.keys(byColumn) as string[]).filter(
      (k) => CORRECTABLE.has(k) && (byColumn[k]?.length ?? 0) > 0,
    );
    const onlyColumn = withMovements[0];
    if (
      withMovements.length === 1 &&
      (byColumn[onlyColumn]?.length ?? 0) === 1
    ) {
      onCellClick(rowId, onlyColumn);
      return;
    }
    setCellNote(
      "This row has more than one entry. Tap the specific movement above to correct it.",
    );
  }

  const filtered = activeTab !== "all";
  const noRows = !loading && !error && rows.length === 0;

  return (
    <PageShell
      wide
      toolbar={
        <>
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Stock &amp; Reconciliation
          </div>
          <div className="grow" />
          <div className="flex items-center shrink-0 gap-(--sp-4)">
            <DatePicker
              value={longDate(date)}
              selected={new Date(`${date}T00:00:00`)}
              onSelect={(d) => setDate(toBusinessDate(d))}
              maxDate={new Date()}
            />
            <a
              href="/admin/stock/opening"
              className="flex items-center h-(--control-md) px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
            >
              <span className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-body/body">
                Opening Stock
              </span>
            </a>
          </div>
        </>
      }
    >
      {/* ───────── Desktop ledger ───────── */}
      <div className="hidden md:flex flex-col grow gap-(--sp-8) min-w-0">
        <div className="flex items-center justify-between [width:100%] shrink-0">
          <PillFilter
            options={locationTabs}
            activeKey={activeTab}
            onChange={setActiveTab}
            aria-label="Filter by location"
          />
        </div>

        {cellNote && (
          <div role="status" className="font-ui text-warning text-body/sm">
            {cellNote}
          </div>
        )}

        {error ? (
          <ErrorState
            title="Couldn't load the stock ledger"
            description={error}
            onRetry={() => void refresh()}
          />
        ) : noRows && filtered ? (
          <EmptyState
            variant="filtered"
            title="No stock movements for this filter"
            description="No movements at this location for the selected day. Try another location or clear the filter."
            actionLabel="Clear filter"
            onAction={() => setActiveTab("all")}
          />
        ) : (
          <div className="[width:100%] max-w-full overflow-x-auto">
            <DenseLedger
              rows={rows}
              totals={rows.length > 0 ? totals : undefined}
              showLocation
              horizontalScroll
              loading={loading && rows.length === 0}
              emptyMessage="No stock movements for this day."
              onCellClick={onCellClick}
            />
          </div>
        )}
      </div>

      {/* ───────── Mobile (artboard 8Q4-0) ───────── */}
      {/* Scrollable list region + a sticky bottom action bar. Table collapses
          to stacked rows: header (product + location chip + closing qty),
          a wrapping row of tappable movement-delta chips (each opens the
          correction drawer), then Open: N + an "Adjust" button. */}
      <div className="flex md:hidden flex-col grow min-h-0">
        <div className="flex items-center [width:100%] overflow-x-auto shrink-0 mb-(--sp-5)">
          <PillFilter
            options={locationTabs}
            activeKey={activeTab}
            onChange={setActiveTab}
            aria-label="Filter by location"
          />
        </div>

        {cellNote && (
          <div
            role="status"
            className="font-ui text-warning text-body/sm shrink-0 mb-(--sp-4)"
          >
            {cellNote}
          </div>
        )}

        <div className="flex flex-col grow min-h-0 overflow-y-auto">
          {error ? (
            <ErrorState
              title="Couldn't load the stock ledger"
              description={error}
              onRetry={() => void refresh()}
            />
          ) : loading && rows.length === 0 ? (
            <div className="flex flex-col [width:100%]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  <div className="kit-skeleton h-[16px] w-1/2 rounded-sm" />
                  <div className="kit-skeleton h-[12px] w-3/4 rounded-sm" />
                  <div className="kit-skeleton h-[12px] w-1/3 rounded-sm" />
                </div>
              ))}
            </div>
          ) : noRows ? (
            filtered ? (
              <EmptyState
                variant="filtered"
                title="No stock movements for this filter"
                description="No movements at this location for the selected day. Try another location or clear the filter."
                actionLabel="Clear filter"
                onAction={() => setActiveTab("all")}
              />
            ) : (
              <EmptyState
                title="No movements this day"
                description="Stock activity for the selected day will show here as it's recorded."
              />
            )
          ) : (
            rows.map((row) => {
              const movementChips = (
                [
                  "purchases",
                  "issues",
                  "production",
                  "transferIn",
                  "transferOut",
                  "sold",
                ] as const
              )
                .filter((k) => !row[k].dash)
                .map((k) => ({
                  key: k,
                  text: `${row[k].value} ${MOBILE_CHIP_LABEL[k] ?? k}`,
                  tone: row[k].tone === "success" ? "success" : "danger",
                  corrected: !!row[k].corrected,
                  columnKey: k as string,
                }));
              return (
                <div
                  key={row.id}
                  className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  <div className="flex items-start justify-between [width:100%]">
                    <div className="flex items-center gap-(--sp-3)">
                      <div className="font-ui font-(--weight-semibold) w-max shrink-0 [color:var(--text-primary)] text-h2/h2">
                        {row.product}
                      </div>
                      <div className="font-ui inline-block px-(--sp-3) rounded-sm [background-color:var(--surface-subtle)]">
                        <div className="font-ui w-max [color:var(--text-secondary)] text-caption/micro">
                          {row.location}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-(--weight-semibold) w-max [color:var(--text-primary)] text-h2/body">
                      {row.closing.value}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-(--sp-4)">
                    {movementChips.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => onCellClick(row.id, m.columnKey)}
                        className={`font-mono w-max shrink-0 text-sm/micro kit-focus-ring rounded-sm ${
                          m.tone === "success" ? "text-success" : "text-danger"
                        } ${
                          m.corrected
                            ? "underline [text-decoration-thickness:1px] underline-offset-2"
                            : ""
                        }`}
                      >
                        {m.text}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between [width:100%]">
                    <div className="font-ui w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
                      Open: {row.opening.value}
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdjustRow(row.id)}
                      className="flex items-center justify-center h-[32px] px-(--sp-5) rounded-sm [background-color:var(--surface-subtle)] kit-focus-ring"
                    >
                      <span className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-sm/micro">
                        Adjust
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky bottom action bar (8Q4-0). "Opening Stock" is the only
            action with a mobile home — the desktop toolbar's payment flow
            lives on /admin/financials, not the ledger. */}
        <div className="flex items-center [width:100%] shrink-0 p-(--sp-5) mt-(--sp-4) [background-color:var(--surface-page)] border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <a
            href="/admin/stock/opening"
            className="flex items-center justify-center h-[44px] grow px-(--sp-6) rounded-sm [background-color:var(--surface-page)] border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
          >
            <span className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-body/sm">
              Opening Stock
            </span>
          </a>
        </div>
      </div>

      {drawerTarget && (
        <CorrectionDrawer
          target={drawerTarget}
          onClose={() => setDrawerTarget(null)}
          onCorrected={refresh}
        />
      )}
    </PageShell>
  );
}
