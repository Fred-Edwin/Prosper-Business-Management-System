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
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState, type EmptyStateProps } from "./empty-state";

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
  className,
}: SimpleTableProps<Row>) {
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
          return col.sortable && onSort ? (
            <button
              key={col.key}
              type="button"
              role="columnheader"
              aria-sort={
                isSorted
                  ? sort!.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              onClick={() => onSort(col.key)}
              className={cn(headerCls, "kit-interactive kit-focus-ring inline-flex items-center gap-[4px]")}
            >
              {col.header}
              <span aria-hidden className="[color:var(--text-tertiary)]">
                {isSorted ? (sort!.direction === "asc" ? "▲" : "▼") : "↕"}
              </span>
            </button>
          ) : (
            <div key={col.key} role="columnheader" className={headerCls}>
              {col.header}
            </div>
          );
        })}
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
            <div className="kit-skeleton h-[14px] w-full" />
          </div>
        ))
      ) : rows.length === 0 ? (
        emptyState ? (
          <div className="p-(--sp-8)">
            <EmptyState {...emptyState} />
          </div>
        ) : (
          <div
            role="row"
            className="flex items-center justify-center h-[44px] px-(--sp-6) shrink-0 font-ui [color:var(--text-tertiary)] text-sm/sm"
          >
            No records
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
          return onRowClick ? (
            <button
              key={rowKey(row)}
              type="button"
              role="row"
              aria-label={rowLabel?.(row)}
              onClick={() => onRowClick(row)}
              className={cn(rowCls, "kit-row kit-focus-ring cursor-pointer")}
            >
              {inner}
            </button>
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
