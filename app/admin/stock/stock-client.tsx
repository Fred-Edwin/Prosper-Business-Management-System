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
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { Button } from "@/components/kit/button";
import { SearchInput } from "@/components/kit/search-input";
import { toBusinessDate } from "@/lib/time";
import { useLedger } from "./use-stock";
import { deriveLedgerRows } from "./derive-ledger";
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

// KPI strip — visually matches the Admin Dashboard's "Position right now"
// band (dashboard-client.tsx PositionBand / Caption), not the kit's
// DenseSummaryStrip (that component is a dense dark FOOTER-bar pattern —
// already used correctly as the Ledger's own table footer and the mobile
// sticky band below — not a hero KPI strip). Owner feedback, this session:
// the first cut used DenseSummaryStrip here and read as the wrong register
// for a page-top KPI band. Rebuilt as a light --surface-subtle card with
// hairline dividers + large mono figures, same recipe as the dashboard.
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
          {/* grow basis-0 (fix, this session): the dashboard's PositionBand
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

export function StockClient() {
  const today = toBusinessDate(new Date());
  const [date, setDate] = React.useState(today);
  // Location scope — re-fetched server-side by useLedger. "__all__" = every
  // location. (Was a <PillFilter>; now a FilterToolbar select, LDZ-0.)
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

  const { data, loading, error, refresh } = useLedger(
    date,
    locationId === ALL ? undefined : locationId,
  );

  const { rows: allRows, totals, cellMovements } = React.useMemo(
    () =>
      deriveLedgerRows({
        movements: data.movements,
        dayClosing: data.dayClosing,
        products: data.products,
        locations: data.locations,
        locationId: locationId === ALL ? undefined : locationId,
      }),
    [data, locationId],
  );

  // productId → kind (Goods/Dishes/Ingredients), for the client-side Category filter.
  const kindByProduct = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.products) m.set(p.id, p.kind);
    return m;
  }, [data.products]);

  const rows = React.useMemo(() => {
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
  }, [allRows, category, kindByProduct, search]);

  // Desktop KPI strip — see LedgerPositionBand above. Summed over the
  // VISIBLE `rows` (post category/search filter), not `totals` (which is
  // the unfiltered day) — so the strip always matches what the grid under
  // it is actually showing. Quantity-only: closing/sold VALUE needs a
  // per-unit cost join the F2 wire doesn't carry yet (same gap
  // `derive-ledger.ts` flags for the grid's own Sold Value / Closing Value
  // columns — pending F3/F4).
  const kpiStats: PositionStat[] = React.useMemo(() => {
    let closing = 0;
    let purchases = 0;
    let kitchen = 0;
    let nonSale = 0;
    let sold = 0;
    for (const r of rows) {
      closing += Number(r.closing.value ?? "0");
      if (!r.purchases.dash) purchases += Number(r.purchases.value);
      if (!r.issues.dash) kitchen += Number(r.issues.value);
      if (!r.nonSale.dash) nonSale += Number(r.nonSale.value);
      if (!r.sold.dash) sold += Number(r.sold.value);
    }
    return [
      { label: "Stock on Hand", value: closing.toFixed(1), tone: "[color:var(--text-primary)]" },
      { label: "Purchases Today", value: purchases === 0 ? "—" : `+${purchases.toFixed(1)}`, tone: "[color:var(--color-success)]" },
      { label: "Kitchen Today", value: kitchen === 0 ? "—" : kitchen.toFixed(1), tone: "[color:var(--color-danger)]" },
      // Warning (amber), not danger red — distinct from Kitchen's normal
      // operational outflow. Non-Sale is the wastage/loss signal the owner
      // asked to see; a non-zero figure here is worth a glance, not an alarm.
      { label: "Non-Sale Today", value: nonSale === 0 ? "—" : nonSale.toFixed(1), tone: "[color:var(--color-warning)]" },
      { label: "Sold Today", value: sold === 0 ? "—" : sold.toFixed(1), tone: "[color:var(--color-info)]" },
    ];
  }, [rows]);

  // Date-control display label ("Aug 24"), per LDZ-0.
  const dateLabel = shortDate(date);

  const filterControls: FilterControl[] = [
    {
      id: "location",
      kind: "select",
      label: "Location",
      options: [
        { value: ALL, label: "All" },
        ...data.locations.map((l) => ({ value: l.id, label: l.name })),
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
    {
      id: "date",
      kind: "date",
      label: "Date",
      value: dateLabel,
      // Default = the business day; off-default once another day is picked.
      default: shortDate(today),
    },
  ];

  function onFilterChange(id: string, value: string | boolean | null) {
    if (id === "location") setLocationId(value == null ? ALL : String(value));
    else if (id === "category") setCategory(value == null ? ALL : String(value));
    else if (id === "date" && typeof value === "string") {
      // The kit reports a picked day as "YYYY-MM-DD"; Reset reports the
      // default label. Anything that isn't a YYYY-MM-DD resets to today.
      setDate(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today);
    }
  }

  function resetFilters() {
    setLocationId(ALL);
    setCategory(ALL);
    setDate(today);
    setSearch("");
  }

  // Shared context (subtitle + unit) for both the single-movement
  // CorrectionDrawer and the multi-movement BreakdownDrawer — one row can
  // feed either, so the "Location · Product · Date" subtitle text is built
  // once, not duplicated per drawer.
  function rowContext(rowId: string) {
    const [productId, rowLocationId] = rowId.split("@");
    const product = data.products.find((p) => p.id === productId);
    const location = data.locations.find((l) => l.id === rowLocationId);
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
      // Correct action (this session, owner-approved). Also the only place
      // a Non-Sale cell's `reason` (wastage/staff-meal/…) is visible, since
      // the grid cell itself only ever shows the summed quantity.
      const movements = ids
        .map((id) => data.movements.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => !!m);
      if (movements.length === 0) return;
      setBreakdownTarget({ movements, subtitle, fieldLabel, unit });
      return;
    }

    const movement = data.movements.find((m) => m.id === ids[0]);
    if (!movement) return;
    setDrawerTarget({ movement, subtitle, fieldLabel, unit });
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
    locationId !== ALL || category !== ALL || date !== today || search.trim() !== "";
  const noRows = !loading && !error && rows.length === 0;

  return (
    <PageShell wide>
      <AdminPageHeader
        title="Stock & Reconciliation"
        actions={
          // Date lives in the FilterToolbar below (LDZ-0). "Opening Stock" is
          // the screen's one real action (not a filter) — promoted to the
          // primary button treatment so it doesn't read as a tertiary link
          // next to the filter row (owner feedback, this session's review).
          <a
            href="/admin/stock/opening"
            className="flex items-center justify-center h-(--control-md) shrink-0 px-(--sp-6) rounded-sm bg-accent [--kit-hover-bg:var(--color-accent-hover)] kit-interactive kit-focus-ring"
          >
            <span className="font-ui font-(--weight-medium) w-max shrink-0 text-(--text-inverse) text-body/body">
              Opening Stock
            </span>
          </a>
        }
      />
      {/* ───────── Desktop ledger ───────── */}
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
            description="No movements match the current filters for the selected day. Try another location or category, or reset."
            actionLabel="Reset filters"
            onAction={resetFilters}
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
        {/* Dark KPI strip (8Q4-0). Both figures are money the stock ledger
            doesn't convert until the M3 MoneyMovement ledger — kept as "—" /
            "M3" markup, same treatment as the Financials KPI strip (ADR-36). */}
        <div className="flex items-stretch [width:100%] shrink-0 py-(--sp-5) px-(--sp-6) mb-(--sp-5) [background-color:var(--nav-bg)]">
          <div className="flex flex-col grow gap-[2px]">
            <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-micro/micro">
              Stock on Hand (Total)
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <div className="font-mono font-(--weight-semibold) text-success text-h1/h2">
                —
              </div>
              <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                M3
              </div>
            </div>
          </div>
          <div className="w-px self-stretch my-[2px] shrink-0 [background-color:var(--nav-border)]" />
          <div className="flex flex-col grow pl-(--sp-6) gap-[2px]">
            <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-micro/micro">
              Today&apos;s Sold Value
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <div className="font-mono font-(--weight-semibold) text-info text-h1/h2">
                —
              </div>
              <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                M3
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
            rows.map((row) => {
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
                    <div className="flex flex-col items-end gap-[2px]">
                      <div className="font-mono font-(--weight-semibold) w-max [color:var(--text-primary)] text-h2/body">
                        {row.closing.value}
                      </div>
                      {/* KES value of closing stock — unwired until the M3
                          money ledger (deriveLedgerRows returns DASH). */}
                      <div className="font-mono w-max [color:var(--text-tertiary)] text-caption/micro">
                        KES —
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
