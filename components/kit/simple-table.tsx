// Verbatim REST transcription of Paper artboard "Component Kit — Tables" (6ET-0):
// "Table Shell" (6EY-0). Structure + every fixed value unchanged (square corners,
// hairline rows, info-bg header, no attribution avatars — §4.1/§4.2).
//
// Session 10 rewire:
//   - clickable rows (onRowClick set) are now real <button>s inside a
//     role="row" — Tab-reachable, Enter/Space activate — instead of a bare
//     <div onClick>. Non-clickable rows are plain (no .kit-row, no tab stop).
//   - `loading` → N `.kit-skeleton` rows (§9.10). `emptyState` slot →
//     <EmptyState> when there are no rows (§2 C15).
//   - `sortable` columns render a header <button> with `aria-sort` + a caret
//     (.kit-interactive); `onSort(key)` toggles.
//   - minimal table semantics: role="table" / "row" / "columnheader" / "cell".
//
// M2 6b: `rowChevron` — opt-in trailing `›` on clickable rows only (A1/A2/A3/A4
// artboards draw one on every clickable row). Off (default) → byte-identical to
// before. On: a fixed-width w-[24px] trailing slot is added to the header (empty
// spacer) and to each clickable body row (a right-pointing chevron), so column
// lanes stay aligned. Only takes effect when `onRowClick` is also set.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState, type EmptyStateProps } from "./empty-state";

// Trailing row affordance — matches the A1 artboard (16×16, ChevronRight,
// --text-tertiary, 1.5 stroke) in a w-[24px] right-aligned slot.
const ROW_CHEVRON = (
  <div className="w-[24px] shrink-0 flex justify-end" aria-hidden>
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <polyline
        points="9 18 15 12 9 6"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export interface SimpleTableColumn<Row> {
  key: string;
  header: string;
  width: string;
  align?: "left" | "right";
  cell?: "text" | "strong" | "mono" | "accent";
  sortable?: boolean;
  render: (row: Row) => React.ReactNode;
}

export interface SimpleTableProps<Row> {
  columns: SimpleTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** Accessible name for each clickable row (e.g. r => `Edit ${r.name}`). */
  rowLabel?: (row: Row) => string;
  loading?: boolean;
  loadingRows?: number;
  /** Shown when `rows` is empty and not loading. */
  emptyState?: EmptyStateProps;
  sort?: { key: string; direction: "asc" | "desc" };
  onSort?: (key: string) => void;
  /**
   * Render a trailing `›` chevron on each clickable row (and a matching header
   * spacer). Opt-in — off by default and only active when `onRowClick` is set.
   */
  rowChevron?: boolean;
  className?: string;
}

const CELL_TEXT: Record<NonNullable<SimpleTableColumn<unknown>["cell"]>, string> = {
  text: "font-ui [color:var(--text-secondary)] text-sm/sm",
  strong: "font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm",
  mono: "font-mono [color:var(--text-secondary)] text-sm/sm",
  accent: "font-ui font-(--weight-medium) text-accent text-sm/sm",
};

export function SimpleTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  loading = false,
  loadingRows = 3,
  emptyState,
  sort,
  onSort,
  rowChevron = false,
  className,
}: SimpleTableProps<Row>) {
  const showChevron = rowChevron && !!onRowClick;
  return (
    <div
      role="table"
      className={cn(
        "[font-synthesis:none] flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      {/* Header Row */}
      <div
        role="row"
        className="flex items-center h-[32px] px-(--sp-6) gap-(--sp-6) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600"
      >
        {columns.map((col) => {
          const isSorted = sort?.key === col.key;
          const headerCls = cn(
            "font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info shrink-0",
            col.width,
            col.align === "right" && "text-right flex justify-end flex-wrap",
          );
          // Sortable header: `role="columnheader"` stays on the wrapper (a
          // native <button> may not carry that role — aria-allowed-role);
          // the inner <button> is the activation + focus target.
          return col.sortable && onSort ? (
            <div
              key={col.key}
              role="columnheader"
              aria-sort={
                isSorted
                  ? sort!.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              className={cn(headerCls, "p-0")}
            >
              <button
                type="button"
                onClick={() => onSort(col.key)}
                className="kit-interactive kit-focus-ring inline-flex items-center gap-[4px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info"
              >
                {col.header}
                <span aria-hidden className="[color:var(--text-tertiary)]">
                  {isSorted ? (sort!.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </div>
          ) : (
            <div key={col.key} role="columnheader" className={headerCls}>
              {col.header}
            </div>
          );
        })}
        {showChevron && <div className="w-[24px] shrink-0" aria-hidden />}
      </div>

      {/* Body */}
      {loading ? (
        Array.from({ length: loadingRows }).map((_, i) => (
          <div
            key={i}
            role="row"
            className={cn(
              "flex items-center h-[44px] px-(--sp-6) shrink-0",
              i < loadingRows - 1 &&
                "border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
            )}
          >
            <div role="cell" className="kit-skeleton h-[14px] w-full" />
          </div>
        ))
      ) : rows.length === 0 ? (
        emptyState ? (
          <div role="row">
            <div role="cell" className="p-(--sp-8)">
              <EmptyState {...emptyState} />
            </div>
          </div>
        ) : (
          <div
            role="row"
            className="flex items-center justify-center h-[44px] px-(--sp-6) shrink-0"
          >
            <div
              role="cell"
              className="font-ui [color:var(--text-tertiary)] text-sm/sm"
            >
              No records
            </div>
          </div>
        )
      ) : (
        rows.map((row, i) => {
          const inner = columns.map((col) => (
            <div
              key={col.key}
              role="cell"
              className={cn(
                "shrink-0",
                col.width,
                CELL_TEXT[col.cell ?? "text"],
                col.align === "right" && "text-right flex justify-end flex-wrap",
              )}
            >
              {col.render(row)}
            </div>
          ));
          const rowCls = cn(
            "flex items-center h-[44px] px-(--sp-6) gap-(--sp-6) shrink-0 [width:100%] text-left",
            i < rows.length - 1 &&
              "border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
          );
          // A clickable row is a focusable `role="row"` with Enter/Space
          // activation (ARIA-valid: `<button role="row">` is not — role `row`
          // is disallowed on a native button, and a button flattens its cell
          // subtree). The row keeps `role="row"` > `role="cell"`; `tabIndex`
          // + the keydown handler make it operable.
          return onRowClick ? (
            <div
              key={rowKey(row)}
              role="row"
              aria-label={rowLabel?.(row)}
              tabIndex={0}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={cn(rowCls, "kit-row kit-focus-ring cursor-pointer")}
            >
              {inner}
              {showChevron && ROW_CHEVRON}
            </div>
          ) : (
            <div key={rowKey(row)} role="row" className={rowCls}>
              {inner}
            </div>
          );
        })
      )}
    </div>
  );
}
