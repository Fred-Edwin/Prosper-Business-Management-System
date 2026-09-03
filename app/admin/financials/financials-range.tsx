"use client";

// M3 S7 — the date-range control for /admin/financials, composed from the
// FROZEN kit: <SegmentedControl> (Today / This week / This month / Custom)
// + the existing single-date <DatePicker>, shown only when Custom is
// selected. The kit <DatePicker> is single-date by design; a range picker
// was explicitly NOT added to the kit (S7 brief). Presets cover the three
// spans the owner asked for; Custom is one business day.
//
// One instance lives in the admin header row on desktop and in the mobile
// "Date Row" below the header — same component, the parent places it.

import * as React from "react";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { DatePicker } from "@/components/kit/date-picker";
import type { FinancialsRange, RangePreset } from "./use-financials-range";
import { shortBusinessDateWithYear } from "./use-financials-range";

const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  custom: "Custom",
};
const LABEL_TO_PRESET: Record<string, RangePreset> = Object.fromEntries(
  Object.entries(PRESET_LABELS).map(([k, v]) => [v, k as RangePreset]),
) as Record<string, RangePreset>;

const OPTIONS = [
  PRESET_LABELS.today,
  PRESET_LABELS.week,
  PRESET_LABELS.month,
  PRESET_LABELS.custom,
];

/** `YYYY-MM-DD` → a local `Date` at midnight (for the DatePicker grid). */
function dateOf(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
/** A local `Date` → `YYYY-MM-DD` (the calendar day picked). */
function ymdOf(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function FinancialsRangeControl({
  range,
  today,
  onPreset,
  onCustomDay,
  className,
}: {
  range: FinancialsRange;
  /** Africa/Nairobi today — the max selectable custom day. */
  today: string;
  onPreset: (preset: Exclude<RangePreset, "custom">) => void;
  onCustomDay: (ymd: string) => void;
  className?: string;
}) {
  const handleSegment = React.useCallback(
    (label: string) => {
      const preset = LABEL_TO_PRESET[label];
      if (preset === "custom") {
        // Entering Custom mode keeps the current `to` as the picked day.
        onCustomDay(range.to);
      } else {
        onPreset(preset);
      }
    },
    [onPreset, onCustomDay, range.to],
  );

  return (
    <div className={`flex items-center gap-(--sp-4) ${className ?? ""}`}>
      <SegmentedControl
        aria-label="Date range"
        options={OPTIONS}
        value={PRESET_LABELS[range.preset]}
        onChange={handleSegment}
      />
      {range.preset === "custom" && (
        <DatePicker
          value={shortBusinessDateWithYear(range.to)}
          selected={dateOf(range.to)}
          maxDate={dateOf(today)}
          onSelect={(d) => onCustomDay(ymdOf(d))}
          aria-label="Custom business date"
        />
      )}
    </div>
  );
}
