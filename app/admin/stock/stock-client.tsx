"use client";

// Session 11 rebuild — COMPOSED from the kit, no longer a transcription of Paper
// artboards 798-0 (desktop ledger) / 7LJ-0 (correction drawer) / 8Q4-0 (mobile).
// Assembled from <PageShell wide> + <FilterToolbar> (Location · Category · Date
// — 3e retrofit off the old <PillFilter> location switch, per LDZ-0) +
// <DenseLedger showLocation horizontalScroll onCellClick loading> +
// <EmptyState variant="filtered"> / <ErrorState> + the rail <Drawer>
// correction flow + <Toast>.
//
// The data path is unchanged: date + location state, useLedger, the derived
// 11 columns via deriveLedgerRows, the >1-movement-per-cell FLAG, and the
// correction-drawer orchestration are verbatim. Category is a client-side
// filter over the derived rows (product.category), no new API. The shell
// "Maximize" collapse is AdminShell's `collapsed` prop (admin-shell-client.tsx,
// ADR-36b), not this file.
//
// LEDGER v2 (this session) — a date-RANGE control (the same
// <AdminDateRangeControl> / useAdminDateRange the Financials/Dashboard
// screens already use, imported as-is: Today / This week / This month / Custom)
// now sits in the header next to the title. Today/Custom (both single-day,
// from===to) render EXACTLY the single-day grid above, unchanged. Week/Month
// switch the grid to a period-summary view — one row per (product,
// location) summed over the whole range (derivePeriodSummaryRows), through
// the SAME <DenseLedger> component — with a "View days →" drill-in per row
// (deriveProductDayRows). The KPI band was also swapped this session: it is
// now four MONEY figures (Revenue / COGS / Non-Sale Value / Gross Profit)
// from useFinancialSummary(from, to), driven by the RANGE not the visible
// grid rows — same precedent as the Financials screen's Profit panel (its
// KPI figures are unfiltered by the transaction-tab filters there too).
import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import { DenseLedger, type LedgerRow } from "@/components/kit/dense-ledger";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { SearchInput } from "@/components/kit/search-input";
import { useLedger, usePeriodLedger, useProductDayLedger } from "./use-stock";
import { deriveLedgerRows } from "./derive-ledger";
import { derivePeriodSummaryRows } from "./derive-period-summary";
import { deriveProductDayRows } from "./derive-product-days";
import { AdminDateRangeControl } from "@/app/admin/date-range-control";
import { useAdminDateRange, shortBusinessDateWithYear } from "@/app/admin/use-date-range";
import { useFinancialSummary } from "@/app/admin/financials/use-financials";
import {
  CorrectionDrawer,
  MovementBreakdownDrawer,
  type CorrectionTarget,
  type BreakdownTarget,
} from "./correction-drawer";

// Human labels for the ledger's movement columns (correction-drawer field label).
const COLUMN_LABEL: Record<string, string> = {
  purchases: "Purchase (+)",
  issues: "Kitchen (-)",
  nonSale: "Non-Sale (-)",
  production: "Production (+)",
  transferIn: "Transfer In (+)",
  transferOut: "Transfer Out (-)",
  sold: "Sold (-)",
};

// Short chip labels for the mobile stacked-row deltas — aligned to artboard
// 8Q4-0 (`+50.0 Purch`  `-18.5 Issue`  `-10.0 Tr Out`  `+40.0 Prod`  `+5.0 Tr In`
// `-38.0 Sold`), per fidelity-audit-m1.md §"Admin Stock — Ledger mobile" item 4.
// "Issue" → "Kitchen" (owner rename, this session) to match the desktop column.
// "Non-Sale" chip added this session alongside the desktop Non-Sale column.
const MOBILE_CHIP_LABEL: Record<string, string> = {
  purchases: "Purch",
  issues: "Kitchen",
  nonSale: "Non-Sale",
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

function unitOf(productLabel: string): string {
  const m = productLabel.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : "units";
}

/** `KES 1,234` — matches profit-panel.tsx / the Financials KPI convention. */
function money(dec: string | undefined): string {
  const n = Number(dec ?? "0");
  if (!Number.isFinite(n)) return "KES 0";
  return `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

// KPI strip — visually matches the Admin Dashboard's "Position right now"
// band (dashboard-client.tsx PositionBand / Caption), not the kit's
// DenseSummaryStrip (that component is a dense dark FOOTER-bar pattern —
// already used correctly as the Ledger's own table footer and the mobile
// sticky band below — not a hero KPI strip). Owner feedback, prior session:
// the first cut used DenseSummaryStrip here and read as the wrong register
// for a page-top KPI band. Rebuilt as a light --surface-subtle card with
// hairline dividers + large mono figures, same recipe as the dashboard.
//
// This session: the band is now 4 MONEY figures (Revenue / COGS / Non-Sale
// Value / Gross Profit) sourced from useFinancialSummary(from, to) — the
// SAME endpoint the Financials Profit panel reads — rather than a
// quantity-only summary over the visible grid rows. It is driven by the
// RANGE, not by Location/Category filters, matching how the Financials
// screen's Profit panel is unfiltered by its own transaction-tab filters.
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-caption/caption">
      {children}
    </span>
  );
}

type PositionStat = { label: string; value: string; tone: string };

function LedgerPositionBand({ stats }: { stats: PositionStat[] }) {
  return (
    <section className="flex shrink-0 rounded-md [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)] py-(--sp-6) px-(--sp-7)">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && (
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-strong)]" />
          )}
          {/* grow basis-0 (fix, prior session): the dashboard's PositionBand
              reads as edge-to-edge because its 4 money columns are wide
              enough to fill the card on their own; the Ledger's shorter
              quantity figures left the same content-sized columns packed
              left with a dead gap to the card's right edge. Stretching each
              column to share the row evenly fixes it without changing the
              per-column recipe (label + gap + value) at all. */}
          <div
            className={`grow basis-0 flex flex-col gap-(--sp-3) ${
              i === 0 ? "pr-(--sp-9)" : i === stats.length - 1 ? "pl-(--sp-9)" : "px-(--sp-9)"
            }`}
          >
            <Caption>{s.label}</Caption>
            <span className={`font-mono font-(--weight-semibold) text-display/display ${s.tone}`}>
              {s.value}
            </span>
          </div>
        </React.Fragment>
      ))}
    </section>
  );
}

const ALL = "__all__";

// Product.kind is the fixed Goods/Dishes/Ingredients enum (Prisma) — the
// Ledger's Category filter reads THIS, not the admin-set free-text
// Product.category (which powers the Sales/New-Order menu grid; a
// same-name-different-field mix-up, not a missing admin UI — see the
// review this session's changes came out of). One-line swap, no schema
// or backend change: `ProductKind` is already on `ProductWithLocations`.
const KIND_LABEL: Record<string, string> = {
  ingredient: "Ingredients",
  dish: "Dishes",
  goods: "Goods",
};
const KIND_OPTIONS = [
  { value: ALL, label: "All" },
  { value: "ingredient", label: KIND_LABEL.ingredient },
  { value: "dish", label: KIND_LABEL.dish },
  { value: "goods", label: KIND_LABEL.goods },
];

// A drill-in target: which (product, location) the period-summary's "View
// days →" is currently showing the day-by-day table for.
type DrillInTarget = {
  productId: string;
  locationId: string;
  productLabel: string;
  locationLabel: string;
};

export function StockClient() {
  const { range, setPreset, setCustomDay, today } = useAdminDateRange();
  const isSingleDay = range.preset === "today" || range.preset === "custom";
  const date = range.from; // single-day presets: from === to

  // Location scope — re-fetched server-side by useLedger/usePeriodLedger.
  // "__all__" = every location. (Was a <PillFilter>; now a FilterToolbar
  // select, LDZ-0.)
  const [locationId, setLocationId] = React.useState<string>(ALL);
  // Category — a client-side cut over the derived rows by Product.kind.
  const [category, setCategory] = React.useState<string>(ALL);
  // Search — client-side substring match over product + location text.
  const [search, setSearch] = React.useState("");
  const [drawerTarget, setDrawerTarget] = React.useState<CorrectionTarget | null>(
    null,
  );
  const [breakdownTarget, setBreakdownTarget] = React.useState<BreakdownTarget | null>(
    null,
  );
  const [cellNote, setCellNote] = React.useState<string | null>(null);
  // Week/Month only — which row's "View days →" is open, if any. Reset
  // whenever the range or location scope changes so a stale drill-in never
  // survives a range/location switch.
  const [drillIn, setDrillIn] = React.useState<DrillInTarget | null>(null);

  React.useEffect(() => {
    setDrillIn(null);
  }, [range.preset, range.from, range.to, locationId]);

  // ── Single-day data path (Today / Custom) — unchanged ──────────────────
  const singleDay = useLedger(date, locationId === ALL ? undefined : locationId);

  const { rows: singleDayAllRows, totals: singleDayTotals, cellMovements } =
    React.useMemo(
      () =>
        deriveLedgerRows({
          movements: singleDay.data.movements,
          dayClosing: singleDay.data.dayClosing,
          products: singleDay.data.products,
          locations: singleDay.data.locations,
          locationId: locationId === ALL ? undefined : locationId,
        }),
      [singleDay.data, locationId],
    );

  // ── Period-summary data path (Week / Month) ─────────────────────────────
  const period = usePeriodLedger(
    range.from,
    range.to,
    locationId === ALL ? undefined : locationId,
  );

  const { rows: periodAllRows, totals: periodTotals } = React.useMemo(
    () =>
      derivePeriodSummaryRows({
        movements: period.data.movements,
        periodClosing: period.data.periodClosing,
        products: period.data.products,
        locations: period.data.locations,
        locationId: locationId === ALL ? undefined : locationId,
      }),
    [period.data, locationId],
  );

  // ── Drill-in data path (Week / Month, one row selected) ─────────────────
  const drillInDay = useProductDayLedger(
    drillIn?.productId ?? null,
    drillIn?.locationId ?? null,
    range.from,
    range.to,
  );

  const drillInProduct = React.useMemo(
    () => period.data.products.find((p) => p.id === drillIn?.productId),
    [period.data.products, drillIn],
  );

  const drillInRows = React.useMemo(() => {
    if (!drillIn) return [];
    return deriveProductDayRows({
      movements: drillInDay.data.movements,
      from: range.from,
      to: range.to,
      closingByDay: drillInDay.data.closingByDay,
      product: drillInProduct,
    });
  }, [drillIn, drillInDay.data, range.from, range.to, drillInProduct]);

  // Active dataset for the current view — used for products/locations
  // shared by the filters and row-context lookups below.
  const activeData = isSingleDay ? singleDay.data : period.data;
  const loading = isSingleDay ? singleDay.loading : period.loading;
  const error = isSingleDay ? singleDay.error : period.error;
  const refresh = isSingleDay ? singleDay.refresh : period.refresh;

  // productId → kind (Goods/Dishes/Ingredients), for the client-side Category filter.
  const kindByProduct = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of activeData.products) m.set(p.id, p.kind);
    return m;
  }, [activeData.products]);

  function applyClientFilters<T extends { id: string; product: string; location?: string }>(
    allRows: T[],
  ): T[] {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (category !== ALL && kindByProduct.get(r.id.split("@")[0]) !== category) {
        return false;
      }
      if (q && !`${r.product} ${r.location ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }

  const rows = React.useMemo(
    () => applyClientFilters(isSingleDay ? singleDayAllRows : periodAllRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSingleDay, singleDayAllRows, periodAllRows, category, kindByProduct, search],
  );

  // Desktop KPI band — 4 money figures from the FLOW summary for the whole
  // range (ADR-57 precedent from the Financials Profit panel: KPI figures
  // are unfiltered by Location/Category, always the full range).
  const { summary, loading: summaryLoading, error: summaryError, refresh: refreshSummary } =
    useFinancialSummary(range.from, range.to);

  const kpiStats: PositionStat[] = React.useMemo(() => {
    const c = summary?.consolidated;
    const nonSale = summary?.nonSaleConsumption?.total;
    return [
      { label: "Sales Revenue", value: money(c?.revenue), tone: "[color:var(--text-primary)]" },
      { label: "Cost of Goods Sold", value: money(c?.cogs), tone: "[color:var(--text-primary)]" },
      { label: "Non-Sale Stock Value", value: money(nonSale), tone: "[color:var(--color-warning)]" },
      { label: "Gross Profit", value: money(c?.grossProfit), tone: "[color:var(--color-success)]" },
    ];
  }, [summary]);

  // Date-control display label ("Aug 24"), per LDZ-0. Single-day only — the
  // FilterToolbar's own Date control stays single-day (Today/Custom); the
  // header's range control is the one place Week/Month lives.
  const dateLabel = shortDate(date);

  const filterControls: FilterControl[] = [
    {
      id: "location",
      kind: "select",
      label: "Location",
      options: [
        { value: ALL, label: "All" },
        ...activeData.locations.map((l) => ({ value: l.id, label: l.name })),
      ],
      value: locationId,
      default: ALL,
    },
    {
      id: "category",
      kind: "select",
      label: "Category",
      options: KIND_OPTIONS,
      value: category,
      default: ALL,
    },
    // Date stays single-day (Today/Custom); Week/Month use the header range
    // control instead — do not add a range picker to this toolbar.
    ...(isSingleDay
      ? ([
          {
            id: "date",
            kind: "date",
            label: "Date",
            value: dateLabel,
            // Default = the business day; off-default once another day is picked.
            default: shortDate(today),
          },
        ] as FilterControl[])
      : []),
  ];

  function onFilterChange(id: string, value: string | boolean | null) {
    if (id === "location") setLocationId(value == null ? ALL : String(value));
    else if (id === "category") setCategory(value == null ? ALL : String(value));
    else if (id === "date" && typeof value === "string") {
      // The kit reports a picked day as "YYYY-MM-DD"; Reset reports the
      // default label. Anything that isn't a YYYY-MM-DD resets to today.
      setCustomDay(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today);
    }
  }

  function resetFilters() {
    setLocationId(ALL);
    setCategory(ALL);
    setPreset("today");
    setSearch("");
  }

  // Shared context (subtitle + unit) for both the single-movement
  // CorrectionDrawer and the multi-movement BreakdownDrawer — one row can
  // feed either, so the "Location · Product · Date" subtitle text is built
  // once, not duplicated per drawer. Single-day view only — corrections
  // only make sense against one movement, so they stay off the
  // period-summary/drill-in views.
  function rowContext(rowId: string) {
    const [productId, rowLocationId] = rowId.split("@");
    const product = activeData.products.find((p) => p.id === productId);
    const location = activeData.locations.find((l) => l.id === rowLocationId);
    const productLabel = product
      ? `${product.name} (${product.unitLabel})`
      : productId;
    return {
      subtitle: `${location?.name ?? rowLocationId} · ${productLabel} · ${shortDate(date)}`,
      unit: product?.unitLabel ?? unitOf(productLabel),
    };
  }

  function onCellClick(rowId: string, columnKey: string) {
    setCellNote(null);
    if (!CORRECTABLE.has(columnKey)) return;
    const ids = cellMovements.get(rowId)?.[columnKey] ?? [];
    if (ids.length === 0) return;

    const { subtitle, unit } = rowContext(rowId);
    const fieldLabel = COLUMN_LABEL[columnKey] ?? columnKey;

    if (ids.length > 1) {
      // Was a "not designed yet" dead end (Session 7 flag) — now opens a
      // breakdown list of the constituent movements, each with its own
      // Correct action (owner-approved). Also the only place a Non-Sale
      // cell's `reason` (wastage/staff-meal/…) is visible, since the grid
      // cell itself only ever shows the summed quantity.
      const movements = ids
        .map((id) => singleDay.data.movements.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => !!m);
      if (movements.length === 0) return;
      setBreakdownTarget({ movements, subtitle, fieldLabel, unit });
      return;
    }

    const movement = singleDay.data.movements.find((m) => m.id === ids[0]);
    if (!movement) return;
    setDrawerTarget({ movement, subtitle, fieldLabel, unit });
  }

  // Period-summary row click (Week/Month) — opens the "View days →"
  // drill-in for that row's product/location. Corrections only make sense
  // against one movement on one day, so a period-summary cell is never a
  // correction target; the SAME onCellClick prop <DenseLedger> already
  // supports for the single-day view is reused here for a different
  // purpose (navigation, not correction) rather than inventing a new
  // trailing-action affordance the kit has no slot for — see the
  // hand-off note on this decision.
  function onPeriodRowClick(rowId: string) {
    const [productId, rowLocationId] = rowId.split("@");
    const product = period.data.products.find((p) => p.id === productId);
    const location = period.data.locations.find((l) => l.id === rowLocationId);
    setDrillIn({
      productId,
      locationId: rowLocationId,
      productLabel: product ? `${product.name} (${product.unitLabel})` : productId,
      locationLabel: location?.name ?? rowLocationId,
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

  const filtered =
    locationId !== ALL || category !== ALL || range.preset !== "today" || search.trim() !== "";
  const noRows = !loading && !error && rows.length === 0;

  const rangeControl = (
    <AdminDateRangeControl
      range={range}
      today={today}
      onPreset={setPreset}
      onCustomDay={setCustomDay}
    />
  );

  // Rows rendered with a leading amber flag marker for the outlier scan
  // (PeriodSummaryRow.flagged, owner-approved amber background + warning
  // icon in the Paper mock). <DenseLedger> itself is never modified —
  // this is a thin per-screen mapper: a "⚠" marker prefixed onto the
  // row's `product` label string is the smallest change that reads as a
  // flag inline with the existing Product cell, without a kit change to
  // add a per-row background-tint prop the kit has no slot for today. See
  // the hand-off note on this decision.
  const periodRowsForGrid: LedgerRow[] = React.useMemo(
    () =>
      (rows as (LedgerRow & { flagged?: boolean })[]).map((r) =>
        r.flagged
          ? { ...r, product: `⚠ ${r.product}` }
          : r,
      ),
    [rows],
  );

  return (
    <PageShell wide>
      <AdminPageHeader
        title="Stock & Reconciliation"
        actions={
          <>
            {/* Desktop: range control sits in the header row, next to the
                title (matches the Financials header pattern / approved
                mock — range control next to the title, not buried in the
                filter toolbar). */}
            <div className="hidden md:block">{rangeControl}</div>
            {/* "Opening Stock" is the screen's one real action (not a
                filter) — promoted to the primary button treatment and
                pushed to the far right so it doesn't read as a tertiary
                link next to the range control. */}
            <a
              href="/admin/stock/opening"
              className="flex items-center justify-center h-(--control-md) shrink-0 px-(--sp-6) rounded-sm bg-accent [--kit-hover-bg:var(--color-accent-hover)] kit-interactive kit-focus-ring"
            >
              <span className="font-ui font-(--weight-medium) w-max shrink-0 text-(--text-inverse) text-body/body">
                Opening Stock
              </span>
            </a>
          </>
        }
      />
      {/* Mobile: range control gets its own row so the header stays
          uncrowded — same technique as Financials' "Date Row". */}
      <div className="md:hidden flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Showing
        </span>
        {rangeControl}
      </div>

      {/* ───────── Desktop ───────── */}
      <div className="hidden md:flex flex-col grow gap-(--sp-8) min-w-0">
        <div className="[width:100%] shrink-0 flex flex-col gap-(--sp-6)">
          <LedgerPositionBand stats={kpiStats} />
          <FilterToolbar
            aria-label="Filter the stock ledger"
            search={
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search products, locations…"
                aria-label="Search the stock ledger"
              />
            }
            controls={filterControls}
            onChange={onFilterChange}
            onReset={resetFilters}
            resultCount={rows.length}
            resultNoun="rows"
          />
        </div>

        {cellNote && (
          <div role="status" className="font-ui text-warning text-body/sm">
            {cellNote}
          </div>
        )}

        {summaryError && (
          <div role="alert" className="font-ui text-danger text-caption/micro">
            KPI figures unavailable: {summaryError}
          </div>
        )}

        {isSingleDay ? (
          error ? (
            <ErrorState
              title="Couldn't load the stock ledger"
              description={error}
              onRetry={() => void refresh()}
            />
          ) : noRows && filtered ? (
            <EmptyState
              variant="filtered"
              title="No stock movements for this filter"
              description="No movements match the current filters for the selected day. Try another location or category, or reset."
              actionLabel="Reset filters"
              onAction={resetFilters}
            />
          ) : (
            <div className="[width:100%] max-w-full overflow-x-auto">
              <DenseLedger
                rows={rows}
                totals={rows.length > 0 ? singleDayTotals : undefined}
                showLocation
                horizontalScroll
                loading={loading && rows.length === 0}
                emptyMessage="No stock movements for this day."
                onCellClick={onCellClick}
              />
            </div>
          )
        ) : drillIn ? (
          <DrillInView
            target={drillIn}
            rows={drillInRows}
            loading={drillInDay.loading}
            error={drillInDay.error}
            onRetry={() => void drillInDay.refresh()}
            onBack={() => setDrillIn(null)}
          />
        ) : error ? (
          <ErrorState
            title="Couldn't load the stock ledger"
            description={error}
            onRetry={() => void refresh()}
          />
        ) : noRows && filtered ? (
          <EmptyState
            variant="filtered"
            title="No stock movements for this filter"
            description="No movements match the current filters for this range. Try another location or category, or reset."
            actionLabel="Reset filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="[width:100%] max-w-full overflow-x-auto">
            <DenseLedger
              rows={periodRowsForGrid}
              totals={rows.length > 0 ? periodTotals : undefined}
              showLocation
              horizontalScroll
              loading={loading && rows.length === 0}
              emptyMessage="No stock movements for this range."
              onCellClick={onPeriodRowClick}
            />
            {rows.length > 0 && (
              <p className="mt-(--sp-3) font-ui [color:var(--text-tertiary)] text-caption/micro">
                Click a row to view its day-by-day breakdown for this range.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ───────── Mobile (artboard 8Q4-0) ───────── */}
      {/* Scrollable list region + a sticky bottom action bar. Table collapses
          to stacked rows: header (product + location chip + closing qty),
          a wrapping row of tappable movement-delta chips (each opens the
          correction drawer), then Open: N + an "Adjust" button. Week/Month
          reuses the same stacked-row shape (deliberate simplification, see
          the notes on <MobileDrillIn>/<MobilePeriodRow> below — visually
          rougher than desktop, functionally correct: no per-cell
          correction target, a "View days" affordance instead). */}
      <div className="flex md:hidden flex-col grow min-h-0">
        <div className="flex items-stretch [width:100%] shrink-0 py-(--sp-5) px-(--sp-6) mb-(--sp-5) [background-color:var(--nav-bg)]">
          <div className="flex flex-col grow gap-[2px]">
            <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-micro/micro">
              Gross Profit
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <div className="font-mono font-(--weight-semibold) text-success text-h1/h2">
                {money(summary?.consolidated.grossProfit)}
              </div>
            </div>
          </div>
          <div className="w-px self-stretch my-[2px] shrink-0 [background-color:var(--nav-border)]" />
          <div className="flex flex-col grow pl-(--sp-6) gap-[2px]">
            <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-micro/micro">
              Sales Revenue
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <div className="font-mono font-(--weight-semibold) text-info text-h1/h2">
                {money(summary?.consolidated.revenue)}
              </div>
            </div>
          </div>
        </div>

        {/* The kit FilterToolbar renders its own < --bp-md chip-scroller +
            count/Reset row (LDZ-0 mobile). */}
        <div className="[width:100%] shrink-0 mb-(--sp-5)">
          <FilterToolbar
            aria-label="Filter the stock ledger"
            search={
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search products, locations…"
                aria-label="Search the stock ledger"
              />
            }
            controls={filterControls}
            onChange={onFilterChange}
            onReset={resetFilters}
            resultCount={rows.length}
            resultNoun="rows"
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
          {isSingleDay ? (
            error ? (
              <ErrorState
                title="Couldn't load the stock ledger"
                description={error}
                onRetry={() => void refresh()}
              />
            ) : loading && rows.length === 0 ? (
              <MobileSkeleton />
            ) : noRows ? (
              filtered ? (
                <EmptyState
                  variant="filtered"
                  title="No stock movements for this filter"
                  description="No movements match the current filters for the selected day. Try another location or category, or reset."
                  actionLabel="Reset filters"
                  onAction={resetFilters}
                />
              ) : (
                <EmptyState
                  title="No movements this day"
                  description="Stock activity for the selected day will show here as it's recorded."
                />
              )
            ) : (
              rows.map((row) => (
                <MobileSingleDayRow
                  key={row.id}
                  row={row}
                  onCellClick={onCellClick}
                  onAdjustRow={onAdjustRow}
                />
              ))
            )
          ) : drillIn ? (
            <MobileDrillIn
              target={drillIn}
              rows={drillInRows}
              loading={drillInDay.loading}
              error={drillInDay.error}
              onRetry={() => void drillInDay.refresh()}
              onBack={() => setDrillIn(null)}
            />
          ) : error ? (
            <ErrorState
              title="Couldn't load the stock ledger"
              description={error}
              onRetry={() => void refresh()}
            />
          ) : loading && rows.length === 0 ? (
            <MobileSkeleton />
          ) : noRows ? (
            filtered ? (
              <EmptyState
                variant="filtered"
                title="No stock movements for this filter"
                description="No movements match the current filters for this range. Try another location or category, or reset."
                actionLabel="Reset filters"
                onAction={resetFilters}
              />
            ) : (
              <EmptyState
                title="No movements for this range"
                description="Stock activity for the selected range will show here as it's recorded."
              />
            )
          ) : (
            (rows as (LedgerRow & { flagged?: boolean })[]).map((row) => (
              <MobilePeriodRow key={row.id} row={row} onOpen={() => onPeriodRowClick(row.id)} />
            ))
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

      {breakdownTarget && (
        <MovementBreakdownDrawer
          target={breakdownTarget}
          onClose={() => setBreakdownTarget(null)}
          onPickMovement={(movement) => {
            // Hand off breakdown → single correction for that one movement,
            // reusing the same subtitle/fieldLabel/unit context.
            setDrawerTarget({
              movement,
              subtitle: breakdownTarget.subtitle,
              fieldLabel: breakdownTarget.fieldLabel,
              unit: breakdownTarget.unit,
            });
            setBreakdownTarget(null);
          }}
        />
      )}

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

// ── Period-summary drill-in ("View days →") — desktop ─────────────────────
//
// Renders through the SAME <DenseLedger> kit component (reuse, not a
// fork): ProductDayRow is LedgerRow minus product/location plus
// businessDate, so each day's row synthesizes a `product` label from its
// date and Location is hidden (`showLocation={false}`) since the whole
// table is already scoped to one product/location by the header above it.
function DrillInView({
  target,
  rows,
  loading,
  error,
  onRetry,
  onBack,
}: {
  target: DrillInTarget;
  rows: ReturnType<typeof deriveProductDayRows>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const gridRows: LedgerRow[] = rows.map((r) => ({
    ...r,
    product: shortDate(r.businessDate),
  }));

  return (
    <div className="flex flex-col gap-(--sp-6)">
      <div className="flex flex-col gap-(--sp-2)">
        <button
          type="button"
          onClick={onBack}
          className="w-max font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/micro kit-focus-ring"
        >
          ← Back to period summary
        </button>
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
          {target.productLabel}
        </h2>
        <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          {target.locationLabel} · day-by-day for the selected range
        </span>
      </div>

      {error ? (
        <ErrorState
          title="Couldn't load this product's day-by-day ledger"
          description={error}
          onRetry={onRetry}
        />
      ) : (
        <div className="[width:100%] max-w-full overflow-x-auto">
          <DenseLedger
            rows={gridRows}
            showLocation={false}
            horizontalScroll
            loading={loading && gridRows.length === 0}
            emptyMessage="No stock movements for this product in this range."
          />
        </div>
      )}
    </div>
  );
}

// ── Period-summary drill-in ("View days →") — mobile ───────────────────────
// NOTE (deliberate simplification, not a TODO(mock) — no backend/data gap):
// mobile drill-in reuses the single-day mobile stacked-row shape rather
// than a bespoke design pass — functionally correct (every day in the
// range, its movement deltas, opening/closing) but visually rougher than
// the desktop DenseLedger drill-in. Left as-is per the session's scope
// priority (desktop correctness first); a follow-up session should give
// this its own Paper reference if the owner wants a
// tighter mobile treatment.
function MobileDrillIn({
  target,
  rows,
  loading,
  error,
  onRetry,
  onBack,
}: {
  target: DrillInTarget;
  rows: ReturnType<typeof deriveProductDayRows>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col [width:100%]">
      <div className="flex flex-col gap-(--sp-2) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <button
          type="button"
          onClick={onBack}
          className="w-max font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/micro kit-focus-ring"
        >
          ← Back to period summary
        </button>
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
          {target.productLabel}
        </h2>
        <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          {target.locationLabel} · day-by-day
        </span>
      </div>

      {error ? (
        <ErrorState
          title="Couldn't load this product's day-by-day ledger"
          description={error}
          onRetry={onRetry}
        />
      ) : loading && rows.length === 0 ? (
        <MobileSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No movements in this range"
          description="This product had no stock activity for the selected range."
        />
      ) : (
        rows.map((row) => {
          const chips = (
            [
              "purchases",
              "issues",
              "nonSale",
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
            }));
          return (
            <div
              key={row.id}
              className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="flex items-start justify-between [width:100%]">
                <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
                  {shortDate(row.businessDate)}
                </div>
                <div className="flex flex-col items-end gap-[2px]">
                  <div className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/body">
                    {row.closing.value}
                  </div>
                  <div className="font-mono [color:var(--text-tertiary)] text-caption/micro">
                    {row.closingValue.dash ? "—" : row.closingValue.value}
                  </div>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-(--sp-4)">
                {chips.map((c) => (
                  <span
                    key={c.key}
                    className={`font-mono text-sm/micro ${
                      c.tone === "success" ? "text-success" : "text-danger"
                    }`}
                  >
                    {c.text}
                  </span>
                ))}
              </div>
              <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                Open: {row.opening.value}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MobileSkeleton() {
  return (
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
  );
}

function MobileSingleDayRow({
  row,
  onCellClick,
  onAdjustRow,
}: {
  row: LedgerRow;
  onCellClick: (rowId: string, columnKey: string) => void;
  onAdjustRow: (rowId: string) => void;
}) {
  const movementChips = (
    [
      "purchases",
      "issues",
      "nonSale",
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
    <div className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
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
        <div className="flex flex-col items-end gap-[2px]">
          <div className="font-mono font-(--weight-semibold) w-max [color:var(--text-primary)] text-h2/body">
            {row.closing.value}
          </div>
          <div className="font-mono w-max [color:var(--text-tertiary)] text-caption/micro">
            {row.closingValue.dash ? "KES —" : row.closingValue.value}
          </div>
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
}

// NOTE (deliberate simplification, not a TODO(mock) — no backend/data
// gap): the mobile period-summary row reuses the single-day mobile
// stacked-row shape (chips + closing + a trailing action button) with
// "Adjust" swapped for "View days" and no per-chip click target — a
// deliberate simplification, not a missing feature, since corrections
// never apply to a period-summary row. Flagged rows get the same amber
// background + warning-icon treatment as the desktop grid. Visually
// rougher than a bespoke mobile period card would be; left this way per
// the session's scope priority (desktop correctness first).
function MobilePeriodRow({
  row,
  onOpen,
}: {
  row: LedgerRow & { flagged?: boolean };
  onOpen: () => void;
}) {
  const movementChips = (
    [
      "purchases",
      "issues",
      "nonSale",
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
    }));
  return (
    <div
      className={`flex flex-col [width:100%] py-(--sp-4) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
        row.flagged ? "[background-color:var(--color-warning-bg)]" : ""
      }`}
    >
      <div className="flex items-start justify-between [width:100%]">
        <div className="flex items-center gap-(--sp-3)">
          {row.flagged && (
            <span aria-hidden className="text-warning text-h2/h2">
              ⚠
            </span>
          )}
          <div className="font-ui font-(--weight-semibold) w-max shrink-0 [color:var(--text-primary)] text-h2/h2">
            {row.product}
          </div>
          <div className="font-ui inline-block px-(--sp-3) rounded-sm [background-color:var(--surface-subtle)]">
            <div className="font-ui w-max [color:var(--text-secondary)] text-caption/micro">
              {row.location}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-[2px]">
          <div className="font-mono font-(--weight-semibold) w-max [color:var(--text-primary)] text-h2/body">
            {row.closing.value}
          </div>
          <div className="font-mono w-max [color:var(--text-tertiary)] text-caption/micro">
            {row.closingValue.dash ? "KES —" : row.closingValue.value}
          </div>
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-(--sp-4)">
        {movementChips.map((m) => (
          <span
            key={m.key}
            className={`font-mono w-max shrink-0 text-sm/micro ${
              m.tone === "success" ? "text-success" : "text-danger"
            }`}
          >
            {m.text}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between [width:100%]">
        <div className="font-ui w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
          Open: {row.opening.value}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-center h-[32px] px-(--sp-5) rounded-sm [background-color:var(--surface-subtle)] kit-focus-ring"
        >
          <span className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-sm/micro">
            View days →
          </span>
        </button>
      </div>
    </div>
  );
}
