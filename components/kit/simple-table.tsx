// Verbatim transcription of Paper artboard "Component Kit — Tables" (6ET-0):
// "Table Shell" (6EY-0). Structure and every fixed value are exactly as get_jsx emitted:
//
//   shell   : flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]
//   header  : h-[32px] px-(--sp-6) gap-(--sp-6) bg-info-bg border-b border-b-solid
//             border-b-gray-600
//   header cell : font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase
//                 leading-[12px] text-info  (right-aligned cols add `text-right flex
//                 justify-end flex-wrap`)
//   body row: h-[44px] px-(--sp-6) gap-(--sp-6); every row except the last has
//             border-b border-b-solid [border-bottom-color:var(--border-subtle)]
//   body cell text: text-sm/sm; name col `font-(--weight-medium) [color:var(--text-primary)]`,
//                   text cols `[color:var(--text-secondary)]`, mono cols `font-mono`.
//
// Column widths from the artboard: first col `grow min-w-[200px]`, the rest fixed
// (`w-[180px]`, `w-[160px]`, `w-[140px]`, …, edit `w-[50px]`).
//
// Session 2 §8: rows are NOT multi-selectable in M1 (row click opens the edit drawer). The
// hover tint (drawn once on Row 2 as `[background-color:var(--surface-hover)]`) is the §9.3
// load-bearing affordance — applied via `.kit-row` when `onRowClick` is set. Empty / no-
// results = the EmptyState kit component (9U3-0). Loading = 3 `.kit-skeleton` rows (§9.10).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SimpleTableColumn<Row> {
  key: string;
  header: string;
  /** Tailwind width class for the cell — e.g. "w-[180px]" or "grow min-w-[200px]". */
  width: string;
  align?: "left" | "right";
  /** Cell text style: "text" (secondary), "strong" (primary medium), "mono", "accent". */
  cell?: "text" | "strong" | "mono" | "accent";
  render: (row: Row) => React.ReactNode;
}

export interface SimpleTableProps<Row> {
  columns: SimpleTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
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
  className,
}: SimpleTableProps<Row>) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      {/* Header Row */}
      <div className="flex items-center h-[32px] px-(--sp-6) gap-(--sp-6) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600">
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              "font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] text-info shrink-0",
              col.width,
              col.align === "right" && "text-right flex justify-end flex-wrap",
            )}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Body Rows */}
      {rows.map((row, i) => (
        <div
          key={rowKey(row)}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={cn(
            "flex items-center h-[44px] px-(--sp-6) gap-(--sp-6) shrink-0",
            i < rows.length - 1 &&
              "border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
            onRowClick && "kit-row cursor-pointer",
          )}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "shrink-0",
                col.width,
                CELL_TEXT[col.cell ?? "text"],
                col.align === "right" && "text-right flex justify-end flex-wrap",
              )}
            >
              {col.render(row)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
