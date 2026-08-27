// Verbatim transcription of Paper artboard "Component Kit — Chips & Status" (6DJ-0):
// "Condition Chip Row" (6EC-0). Session 2 verified state-complete; display-only. Same
// dot + label markup as status-chip (h-[20px] rounded-lg gap-[6px]; 6px dot;
// font-(--weight-medium) text-caption/micro label). Three fixed conditions:
//   Good           → bg-success / text-success
//   Needs Repair   → bg-warning / text-warning
//   Decommissioned → bg-danger  / text-danger
//
// Note (Session 2 §8): the Assets table renders these at --text-sm / 400 for table density;
// the kit chip density is --text-caption / 500 as transcribed here. Both are legitimate.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type AssetCondition = "Good" | "Needs Repair" | "Decommissioned";

export interface ConditionChipProps {
  condition: AssetCondition;
  className?: string;
}

const STYLES: Record<AssetCondition, { dot: string; label: string }> = {
  Good: { dot: "bg-success", label: "text-success" },
  "Needs Repair": { dot: "bg-warning", label: "text-warning" },
  Decommissioned: { dot: "bg-danger", label: "text-danger" },
};

export function ConditionChip({ condition, className }: ConditionChipProps) {
  const s = STYLES[condition];
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center h-[20px] rounded-lg gap-[6px] antialiased",
        className,
      )}
    >
      <div className={cn("w-[6px] h-[6px] shrink-0 rounded-[50%]", s.dot)} />
      <div className={cn("font-ui font-(--weight-medium) text-caption/micro", s.label)}>
        {condition}
      </div>
    </div>
  );
}
