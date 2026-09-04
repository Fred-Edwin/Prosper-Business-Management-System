// Verbatim transcription of Paper artboard "Component Kit — Tables" (6ET-0):
// "Ledger Shell" (6FR-0) — header (6KG-0), data rows (6MY-0 …), the "Ledger Row — Hover"
// state (9OM-0), the "Ledger — Empty state" (9OZ-0) and the "Ledger Footer" (6O1-0).
// Every fixed value is exactly as get_jsx emitted:
//
//   shell : flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]
//   header: h-[32px] px-(--sp-6) gap-(--sp-5) bg-info-bg border-b border-b-solid
//           border-b-gray-600 ; cell font-(--weight-semibold) text-[10px] tracking-[0.04em]
//           uppercase leading-[12px] text-info (numeric cols add text-right flex justify-end
//           flex-wrap)
//   data row: h-[38px] px-(--sp-6) gap-(--sp-5) border-b border-b-solid
//             [border-bottom-color:var(--border-subtle)]
//   data cell: font-mono font-(--weight-regular) text-sm/micro, numeric cols text-right
//              flex justify-end flex-wrap. Value color: positive → text-success,
//              negative → text-danger, empty ("—") → [color:var(--text-tertiary)].
//              Closing / Closing Value cols → font-(--weight-semibold) [color:var(--text-primary)].
//   corrected cell (ADR-36a / §4.3): the value in its semantic color PLUS
//              `underline-offset-2 [text-decoration:underline_1px]`. NO chip. The cell is the
//              correction-drawer click target.
//   row hover: [background-color:var(--surface-hover)]  (the §9.3 load-bearing affordance)
//   empty:    h-[38px] px-(--sp-6) justify-center py-(--sp-7); single centered
//             font-(--weight-medium) [color:var(--text-tertiary)] text-sm/micro line
//   footer:   h-[36px] px-(--sp-6) gap-(--sp-5) bg-gray-900; cell font-ui
//             font-(--weight-semibold) text-sm/micro, text-white / text-success / text-danger;
//             the trailing Edit slot is text-transparent.
//
// Column widths from the artboard header: Product `grow min-w-[140px]`, Opening `w-[90px]`,
// Purchases `w-[100px]`, Issues `w-[90px]`, Production `w-[100px]`, Transfer In `w-[110px]`,
// Transfer Out `w-[120px]`, Sold `w-[80px]`, Sold Value `w-[100px]`, Closing `w-[90px]`,
// Closing Value `w-[110px]`, Edit `w-[50px]`. Non-Sale `w-[100px]` (added this session,
// not on the artboard — see below).
//
// "Issues" → "Kitchen" (owner rename, this session's ledger-review pass). The
// underlying MovementType is still `issue` in the
// schema/API (a Store→Kitchen ingredient draw, distinct from non-sale consumption
// wastage/staff-meal/etc — the two were never the same event, only mislabeled the
// same in the grid). Cosmetic column label only; only real consumer today is the
// Admin Stock ledger (stock-client.tsx) — Paper artboard 6ET-0 is stale on this
// label like it already is on the Location column above.
//
// NON-SALE COLUMN (added this session, owner-authorised — kit change, same
// footing as the Location column above; Paper 6ET-0 is stale on it too).
// `non_sale_consumption` movements (wastage / staff meal / complimentary /
// damaged / other) used to be silently merged into Kitchen (Issues) — see
// `derive-ledger.ts` COLUMN_FOR_TYPE. Split into its own `w-[100px]` column
// right after Kitchen so the two events (a normal Store→Kitchen draw vs.
// stock that left for an exceptional non-sale reason) are visually
// distinguishable on the grid, per the owner's review this session.
//
// LOCATION COLUMN (added Session 4b, owner-authorised — see DECISIONS.md ADR-37a). The
// Admin Stock ledger screens (798-0 / 7G9-0 / 7LJ-0) draw a leading Location column
// (`w-[100px]`, `[color:var(--text-secondary)] text-sm/sm`) that the base kit artboard
// (6ET-0) does not. It is OPT-IN via `showLocation` + `LedgerRow.location`; omitted, the
// component is byte-identical to the 6ET-0 transcription. The Paper kit artboard 6ET-0 is
// currently stale w.r.t. this prop — a follow-up Design Sprint adds the Location-column
// state to 6ET-0 and this comment is removed.
//
// STICKY-LEFT PIN (design-principles.md §4.3, implemented this session — the spec
// predates this build). When `horizontalScroll` is set, the Location + Product cells
// are `position: sticky; left: 0/<location width>` with an opaque background (so
// scrolling movement/value columns don't show through) and a hairline right border
// on Product marking the pinned/scroll boundary — applied to header, every data row,
// and the footer alike so the divider reads as one continuous vertical line. Only
// active with `horizontalScroll` — the non-scrolling base usage (byte-identical
// without it) needs no pin.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** A single ledger cell value. `dash` renders the tertiary "—". */
export interface LedgerCell {
  /** Rendered text. Ignored when `dash` is true. */
  value?: string;
  dash?: boolean;
  tone?: "success" | "danger" | "default";
  /** Semantic-color + 1px underline; marks this cell as corrected (ADR-36a). */
  corrected?: boolean;
}

export interface LedgerRow {
  id: string;
  /** Optional leading Location cell — rendered only when the ledger has `showLocation`. */
  location?: string;
  product: string;
  opening: LedgerCell;
  purchases: LedgerCell;
  issues: LedgerCell;
  /**
   * `non_sale_consumption` movements (wastage / staff meal / complimentary /
   * damaged / other) — split into its own column, this session, from what
   * used to be silently merged into `issues`. Owner review: a Kitchen draw
   * (Store→Kitchen, `issues`) and stock that left without being sold for an
   * exceptional reason are different events that happened to share one
   * column. Correction-drawer / breakdown surfaces the `reason`.
   */
  nonSale: LedgerCell;
  production: LedgerCell;
  transferIn: LedgerCell;
  transferOut: LedgerCell;
  sold: LedgerCell;
  soldValue: LedgerCell;
  closing: LedgerCell;
  closingValue: LedgerCell;
}

export interface LedgerTotals {
  label: string;
  opening: LedgerCell;
  purchases: LedgerCell;
  issues: LedgerCell;
  nonSale: LedgerCell;
  production: LedgerCell;
  transferIn: LedgerCell;
  transferOut: LedgerCell;
  sold: LedgerCell;
  soldValue: LedgerCell;
  closing: LedgerCell;
  closingValue: LedgerCell;
}

export interface DenseLedgerProps {
  rows: LedgerRow[];
  totals?: LedgerTotals;
  emptyMessage?: string;
  /** Render N `.kit-skeleton` rows instead of data (§9.10). */
  loading?: boolean;
  loadingRows?: number;
  /**
   * When true, a leading Location column (`w-[100px]`) is rendered before Product, using
   * `LedgerRow.location`. The Admin Stock ledger screens set this (ADR-37a); the base
   * catalog/reconciliation usages leave it off. Header label = "Location".
   */
  showLocation?: boolean;
  /**
   * When true, rows/header/footer are laid out `w-max min-w-full` so the table scrolls
   * horizontally inside its own `overflow-x-auto` wrapper instead of squashing to
   * `[width:100%]`. The Admin Stock ledger screens set this.
   */
  horizontalScroll?: boolean;
  /** Called with (rowId, columnKey) when a data cell is clicked (correction target). */
  onCellClick?: (rowId: string, columnKey: string) => void;
  className?: string;
}

// (key, header, width class, whether numeric/right-aligned)
const COLUMNS: [keyof LedgerRow & string, string, string, boolean][] = [
  ["product", "Product", "grow min-w-[140px]", false],
  ["opening", "Opening", "w-[90px]", true],
  ["purchases", "Purchases (+)", "w-[100px]", true],
  ["issues", "Kitchen (-)", "w-[90px]", true],
  ["nonSale", "Non-Sale (-)", "w-[100px]", true],
  ["production", "Production (+)", "w-[100px]", true],
  ["transferIn", "Transfer In (+)", "w-[110px]", true],
  ["transferOut", "Transfer Out (-)", "w-[120px]", true],
  ["sold", "Sold (-)", "w-[80px]", true],
  ["soldValue", "Sold Value", "w-[100px]", true],
  ["closing", "Closing", "w-[90px]", true],
  ["closingValue", "Closing Value", "w-[110px]", true],
];

const CLOSING_KEYS = new Set(["closing", "closingValue"]);

/** Location column width (matches its `w-[100px]` class below). */
const LOCATION_COL_WIDTH = 100;

/** Sticky-left offset for the Product cell: after Location when shown, else 0. */
function productStickyLeft(showLocation: boolean): number {
  return showLocation ? LOCATION_COL_WIDTH : 0;
}

/**
 * The header's `bg-info-bg` is `--color-info-bg` at 10% alpha — correct for a
 * normal (non-sticky) cell painted once over the page background, but a
 * STICKY header cell repaints on top of the scrolling columns behind it, so
 * a translucent fill lets their text show through (visible bleed-through
 * bug, caught this session). `background-image` paints above
 * `background-color`, so stacking the same translucent token as an image
 * over an explicit opaque `--surface-page` color-stop composites it solid —
 * same visual tint, now actually opaque. Sticky-only; the base (non-scroll)
 * header keeps the plain `bg-info-bg` class untouched.
 */
const STICKY_HEADER_BG: React.CSSProperties = {
  backgroundColor: "var(--surface-page)",
  backgroundImage:
    "linear-gradient(var(--color-info-bg), var(--color-info-bg))",
};

function toneClass(cell: LedgerCell): string {
  if (cell.dash) return "[color:var(--text-tertiary)]";
  if (cell.tone === "success") return "text-success";
  if (cell.tone === "danger") return "text-danger";
  return "[color:var(--text-primary)]";
}

function DataCell({
  cell,
  colKey,
  widthCls,
  numeric,
  onClick,
  label,
}: {
  cell: LedgerCell;
  colKey: string;
  widthCls: string;
  numeric: boolean;
  onClick?: () => void;
  label?: string;
}) {
  const cls = cn(
    "font-mono text-sm/micro shrink-0",
    CLOSING_KEYS.has(colKey)
      ? "font-(--weight-semibold)"
      : "font-(--weight-regular)",
    widthCls,
    numeric && "text-right flex justify-end flex-wrap",
    toneClass(cell),
    // ADR-36a corrected cell — value in its semantic colour + a 1px underline.
    cell.corrected &&
      "underline [text-decoration-thickness:1px] underline-offset-2",
  );
  const content = cell.dash ? "—" : cell.value;
  // Clickable cell = the correction-drawer target. Keyboard-operable.
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(cls, "kit-interactive kit-focus-ring cursor-pointer bg-transparent")}
    >
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function DenseLedger({
  rows,
  totals,
  emptyMessage = "No movements recorded for this filter.",
  showLocation = false,
  horizontalScroll = false,
  loading = false,
  loadingRows = 3,
  onCellClick,
  className,
}: DenseLedgerProps) {
  // Row/header/footer width behaviour: `[width:100%]` (base) or `w-max min-w-full`
  // (horizontalScroll — the Admin Stock ledger screens, so the wide table scrolls inside
  // its own overflow-x-auto wrapper).
  const lineWidth = horizontalScroll ? "w-max min-w-full" : "[width:100%]";

  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      {/* Ledger Header */}
      <div
        className={cn(
          "flex items-center h-[32px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600",
          lineWidth,
        )}
      >
        {showLocation && (
          <div
            style={horizontalScroll ? STICKY_HEADER_BG : undefined}
            className={cn(
              "w-[100px] shrink-0 font-ui font-(--weight-semibold) [letter-spacing:var(--tracking-caps)] uppercase inline-block text-info text-caption/micro",
              horizontalScroll ? "sticky left-0 [z-index:var(--z-sticky)]" : "bg-info-bg",
            )}
          >
            Location
          </div>
        )}
        {COLUMNS.map(([key, header, widthCls, numeric]) => (
          <div
            key={key}
            style={
              horizontalScroll && key === "product"
                ? { left: productStickyLeft(showLocation), ...STICKY_HEADER_BG }
                : undefined
            }
            className={cn(
              "font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info shrink-0",
              widthCls,
              numeric && "text-right flex justify-end flex-wrap",
              horizontalScroll &&
                key === "product" &&
                "sticky [z-index:var(--z-sticky)] border-r border-r-solid [border-right-color:var(--border-subtle)]",
            )}
          >
            {header}
          </div>
        ))}
        <div className="w-[50px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase shrink-0 justify-start leading-[12px] text-info">
          Edit
        </div>
      </div>

      {/* Data Rows / Empty / Loading */}
      {loading ? (
        Array.from({ length: loadingRows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center h-[38px] px-(--sp-6) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
              lineWidth,
            )}
          >
            <div className="kit-skeleton h-[12px] w-full" />
          </div>
        ))
      ) : rows.length === 0 ? (
        <div className="flex items-center h-[38px] px-(--sp-6) [width:100%] justify-center py-(--sp-7) shrink-0">
          <div className="font-ui font-(--weight-medium) min-w-[0px] text-center flex justify-center flex-wrap [color:var(--text-tertiary)] text-sm/micro">
            {emptyMessage}
          </div>
        </div>
      ) : (
        rows.map((row) => (
          <div
            key={row.id}
            className={cn(
              "flex items-center h-[38px] px-(--sp-6) gap-(--sp-5) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
              // §9.3: the hover tint signals "this row does something" — only when
              // cells are actually clickable.
              onCellClick && "kit-row",
              lineWidth,
            )}
          >
            {showLocation && (
              <div
                className={cn(
                  "w-[100px] shrink-0 font-ui inline-block [color:var(--text-secondary)] text-sm/sm",
                  horizontalScroll &&
                    "kit-ledger-sticky sticky left-0 [z-index:var(--z-sticky)]",
                )}
              >
                {row.location}
              </div>
            )}
            <div
              style={
                horizontalScroll
                  ? { left: productStickyLeft(showLocation) }
                  : undefined
              }
              className={cn(
                "font-ui font-(--weight-medium) grow min-w-[140px] [color:var(--text-primary)] text-sm/micro",
                horizontalScroll &&
                  "kit-ledger-sticky sticky [z-index:var(--z-sticky)] border-r border-r-solid [border-right-color:var(--border-subtle)]",
              )}
            >
              {row.product}
            </div>
            {COLUMNS.slice(1).map(([key, colHeader, widthCls, numeric]) => (
              <DataCell
                key={key}
                cell={row[key] as LedgerCell}
                colKey={key}
                widthCls={widthCls}
                numeric={numeric}
                label={`Correct ${colHeader} for ${row.product}`}
                onClick={
                  onCellClick ? () => onCellClick(row.id, key) : undefined
                }
              />
            ))}
            <div className="w-[50px] font-ui font-(--weight-medium) shrink-0 justify-start text-accent text-sm/micro">
              Edit
            </div>
          </div>
        ))
      )}

      {/* Ledger Footer */}
      {totals && (
        <div
          className={cn(
            "flex items-center h-[36px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-gray-900",
            lineWidth,
          )}
        >
          {showLocation && (
            <div
              className={cn(
                "w-[100px] shrink-0",
                horizontalScroll && "sticky left-0 [z-index:var(--z-sticky)] bg-gray-900",
              )}
            />
          )}
          <div
            style={
              horizontalScroll
                ? { left: productStickyLeft(showLocation) }
                : undefined
            }
            className={cn(
              "font-ui font-(--weight-semibold) grow min-w-[140px] text-(--text-inverse) text-sm/micro",
              horizontalScroll &&
                "sticky [z-index:var(--z-sticky)] bg-gray-900 border-r border-r-solid [border-right-color:var(--nav-border)]",
            )}
          >
            {totals.label}
          </div>
          {COLUMNS.slice(1).map(([key, , widthCls]) => {
            const cell = totals[key as keyof LedgerTotals] as LedgerCell;
            const tone =
              cell.tone === "success"
                ? "text-success"
                : cell.tone === "danger"
                  ? "text-danger"
                  : "text-(--text-inverse)";
            return (
              <div
                key={key}
                className={cn(
                  "font-ui font-(--weight-semibold) text-sm/micro text-right shrink-0 flex justify-end flex-wrap",
                  widthCls,
                  tone,
                )}
              >
                {cell.dash ? "—" : cell.value}
              </div>
            );
          })}
          <div className="w-[50px] font-ui font-(--weight-semibold) shrink-0 justify-start text-transparent text-sm/micro">
            Edit
          </div>
        </div>
      )}
    </div>
  );
}
