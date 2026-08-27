// Verbatim transcription of Paper artboard "Component Kit — Stat Tiles & KPI" (6R4-0):
// "Strip" (6RT-0). Session 2 §8 verified this is one canonical version across the ledger
// footer, the bulk-grid valuation footer and this sample.
//
//   container: flex items-center h-[44px] px-(--sp-6) rounded-md gap-(--sp-8) shrink-0
//              bg-gray-900
//   pair     : flex items-baseline gap-[6px]  (a trailing pair adds `ml-auto`)
//   label    : font-ui font-(--weight-medium) text-[#FFFFFF99] text-caption/micro
//   value    : font-mono font-(--weight-semibold) text-sm/micro; color is
//              text-white (default) / text-warning / text-danger / text-success
//
// Session 10: raw `text-[#FFFFFF99]` → `text-(--nav-text-subtle)` (the codified
// name for white @ 60%); `text-white` → `text-(--text-inverse)`.
//
// NOTE: "Stat tile row" (the 4-tile KPI strip on the same artboard, 6R7-0) is Milestone 3
// per milestone-1-plan.md §2 — deliberately NOT built this session.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SummaryStripItem {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
  /** Pushes this pair (and any after it) to the right via `ml-auto`. */
  alignEnd?: boolean;
}

export interface DenseSummaryStripProps {
  items: SummaryStripItem[];
  className?: string;
}

const VALUE_TONE: Record<NonNullable<SummaryStripItem["tone"]>, string> = {
  default: "text-(--text-inverse)",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

export function DenseSummaryStrip({ items, className }: DenseSummaryStripProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center h-[44px] px-(--sp-6) rounded-md gap-(--sp-8) shrink-0 bg-gray-900 antialiased",
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn("flex items-baseline gap-[6px]", item.alignEnd && "ml-auto")}
        >
          <div className="font-ui font-(--weight-medium) text-(--nav-text-subtle) text-caption/micro">
            {item.label}
          </div>
          <div
            className={cn(
              "font-mono font-(--weight-semibold) text-sm/micro",
              VALUE_TONE[item.tone ?? "default"],
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
