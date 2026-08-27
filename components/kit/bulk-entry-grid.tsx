// Verbatim transcription of Paper artboard "Component Kit — Bulk Entry Grid" (6TT-0):
// "Grid Shell" (6TY-0) — header (6U0-0), a normal editable row (6US-0), the
// "Grid Row — Cell error" (9TQ-0) and the Dish row (6VA-0) — plus the "Valuation Footer"
// (6VM-0). Every fixed value is exactly as get_jsx emitted.
//
//   shell  : flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]
//   header : h-[32px] px-(--sp-6) gap-(--sp-5) bg-info-bg border-b border-b-solid
//            border-b-gray-600 ; cell font-(--weight-semibold) text-[10px]
//            tracking-[0.04em] uppercase leading-[12px] text-info (numeric cols add
//            text-right flex justify-end flex-wrap)
//   row    : h-[48px] px-(--sp-6) gap-(--sp-5) border-b border-b-solid
//            [border-bottom-color:var(--border-subtle)]
//   text cells: item `font-(--weight-medium) [color:var(--text-primary)] text-sm/micro`;
//               category `font-(--weight-medium) text-sm/micro` colored text-info
//               (Ingredient) or text-warning ("Dish (Finished)"); unit `font-mono
//               font-(--weight-regular) [color:var(--text-secondary)]`.
//   CELL (the editable box) — the four states from §8:
//     editable / focused : flex items-center h-[32px] w-[110px] px-(--sp-4) rounded-sm
//                          border border-solid border-accent ;
//                          value font-mono font-(--weight-semibold) [color:var(--text-primary)]
//     non-editable       : + [background-color:var(--surface-subtle)]
//                          [border-color:var(--border-subtle)] ; value font-mono
//                          [color:var(--text-disabled)]
//     error              : border-danger ; value font-mono font-(--weight-semibold) text-danger
//   right cells: Cost/Buying `font-mono font-(--weight-regular) [color:var(--text-primary)]`
//                text-right; Total Value `font-mono font-(--weight-semibold)
//                [color:var(--text-primary)]` text-right.
//
// Column widths from the header: Item `grow min-w-[200px]`, Category `w-[110px]`,
// Unit `w-[60px]`, Store/Restaurant/Canteen `w-[110px]` each, Cost/Buying `w-[120px]`,
// Total Value `w-[140px]`.
//
// Valuation Footer (6VM-0) — h-[44px] px-(--sp-6) rounded-md bg-gray-900; label groups
// separated by `w-px self-stretch bg-[#FFFFFF26]` dividers; labels
// text-[#FFFFFF99] text-caption/micro; values font-mono font-(--weight-semibold)
// text-white (Consolidated = text-success). The leading label group is uppercase
// tracking-[0.04em]. FLAG: [#FFFFFF99] / [#FFFFFF26] are raw literals — kept verbatim.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BulkGridCell {
  value: string;
  editable?: boolean;
  error?: boolean;
  focused?: boolean;
  onChange?: (value: string) => void;
}

export interface BulkGridRow {
  id: string;
  item: string;
  /** e.g. "Ingredient" (info) or "Dish (Finished)" (warning). */
  category: string;
  categoryTone?: "info" | "warning";
  unit: string;
  store: BulkGridCell;
  restaurant: BulkGridCell;
  canteen: BulkGridCell;
  /** e.g. "580.00" or "0.00 (Dish)". */
  costBuying: string;
  /** e.g. "14,500.00" or "—". */
  totalValue: string;
}

export interface BulkGridFooterSegment {
  label: string;
  value: string;
  tone?: "default" | "success";
}

export interface BulkEntryGridProps {
  rows: BulkGridRow[];
  /** Leading uppercase label, e.g. "Consolidated Day 1 Valuation". */
  footerTitle?: string;
  footerSegments?: BulkGridFooterSegment[];
  className?: string;
}

function Cell({ cell, label }: { cell: BulkGridCell; label: string }) {
  const box = cell.error
    ? "border border-solid border-danger"
    : cell.editable
      ? "border border-solid border-accent"
      : "[background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)]";

  const text = cell.error
    ? "font-mono font-(--weight-semibold) text-danger text-sm/micro"
    : cell.editable
      ? "font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro"
      : "font-mono [color:var(--text-disabled)] text-sm/micro";

  return (
    <div
      role="gridcell"
      className={cn(
        "flex items-center h-(--control-sm) w-[110px] shrink-0 px-(--sp-4) rounded-sm kit-field",
        box,
      )}
      data-invalid={cell.error || undefined}
    >
      {cell.editable ? (
        <input
          value={cell.value}
          inputMode="decimal"
          aria-label={label}
          aria-invalid={cell.error || undefined}
          onChange={(e) => cell.onChange?.(e.target.value)}
          className={cn("w-full bg-transparent outline-none", text)}
        />
      ) : (
        <div className={text}>{cell.value}</div>
      )}
    </div>
  );
}

export function BulkEntryGrid({
  rows,
  footerTitle,
  footerSegments,
  className,
}: BulkEntryGridProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-col [width:100%] antialiased",
        className,
      )}
    >
      <div
        role="grid"
        className="flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]"
      >
        {/* Grid Header */}
        <div
          role="row"
          className="flex items-center h-[32px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600"
        >
          {["Item name", "Category", "Unit", "Store", "Restaurant", "Canteen"].map(
            (h, i) => (
              <div
                key={h}
                role="columnheader"
                className={cn(
                  "font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info",
                  i === 0 ? "grow min-w-[200px]" : "shrink-0",
                  i === 2 ? "w-[60px]" : i > 0 && "w-[110px]",
                )}
              >
                {h}
              </div>
            ),
          )}
          <div
            role="columnheader"
            className="w-[120px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info"
          >
            Cost / Buying
          </div>
          <div
            role="columnheader"
            className="w-[140px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info"
          >
            Total Value (KES)
          </div>
        </div>

        {/* Grid Rows */}
        {rows.map((row) => (
          <div
            key={row.id}
            role="row"
            className="flex items-center h-[48px] px-(--sp-6) gap-(--sp-5) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
          >
            <div
              role="rowheader"
              className="grow min-w-[200px] font-ui font-(--weight-medium) whitespace-pre-wrap [color:var(--text-primary)] text-sm/micro"
            >
              {row.item}
            </div>
            <div
              role="gridcell"
              className={cn(
                "w-[110px] font-ui font-(--weight-medium) shrink-0 text-sm/micro",
                row.categoryTone === "warning" ? "text-warning" : "text-info",
              )}
            >
              {row.category}
            </div>
            <div
              role="gridcell"
              className="w-[60px] font-mono font-(--weight-regular) shrink-0 [color:var(--text-secondary)] text-sm/micro"
            >
              {row.unit}
            </div>
            <Cell cell={row.store} label={`${row.item} — Store`} />
            <Cell cell={row.restaurant} label={`${row.item} — Restaurant`} />
            <Cell cell={row.canteen} label={`${row.item} — Canteen`} />
            <div
              role="gridcell"
              className="w-[120px] font-mono font-(--weight-regular) text-right shrink-0 flex justify-end flex-wrap [color:var(--text-primary)] text-sm/micro"
            >
              {row.costBuying}
            </div>
            <div
              role="gridcell"
              className="w-[140px] font-mono font-(--weight-semibold) text-right shrink-0 flex justify-end flex-wrap [color:var(--text-primary)] text-sm/micro"
            >
              {row.totalValue}
            </div>
          </div>
        ))}
      </div>

      {/* Valuation Footer.  --nav-text-subtle / --nav-bg-divider-strong are the
          codified names for the raw #FFFFFF99 / #FFFFFF26 the artboard emitted. */}
      {(footerTitle || footerSegments) && (
        <div className="flex h-[44px] mt-(--sp-6) px-(--sp-6) rounded-md shrink-0 bg-gray-900">
          {footerTitle && (
            <div className="flex items-center font-ui font-(--weight-medium) pr-(--sp-8)">
              <div className="flex font-ui font-(--weight-medium) [letter-spacing:var(--tracking-caps)] uppercase text-(--nav-text-subtle) text-caption/micro">
                {footerTitle}
              </div>
            </div>
          )}
          {(footerSegments ?? []).map((seg, i) => {
            const last = i === (footerSegments?.length ?? 0) - 1;
            return (
              <React.Fragment key={i}>
                <div className="w-px self-stretch shrink-0 bg-(--nav-bg-divider-strong)" />
                <div
                  className={cn(
                    "flex items-center gap-[6px]",
                    i === 0 && footerTitle ? "px-(--sp-6)" : last ? "pl-(--sp-6)" : "px-(--sp-6)",
                    last && "mr-0",
                  )}
                >
                  <div className="font-ui text-(--nav-text-subtle) text-caption/micro">
                    {seg.label}
                  </div>
                  <div
                    className={cn(
                      "font-mono font-(--weight-semibold) text-sm/micro",
                      seg.tone === "success" ? "text-success" : "text-(--text-inverse)",
                    )}
                  >
                    {seg.value}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
