"use client";

// M3 S7 (Financials), promoted to shared `/admin` level in v2 Session B
// (Dashboard) — the date-range control, composed from the FROZEN kit:
// <SegmentedControl> (Today / This week / This month / Custom) + the
// existing single-date <DatePicker>, shown only when Custom is selected.
//
// 2026-09-11 (client feedback — "a proper from/to range, not just a
// custom day"): Custom now shows TWO <DatePicker> triggers (From / To)
// side by side, rather than one. The kit's <DatePicker> is still
// single-date by design (S7 brief) — no new kit primitive was added; this
// composes two of the existing trigger exactly as the toolbar composes
// other kit atoms. `to` is clamped to never precede `from`.

import * as React from "react";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { DatePicker } from "@/components/kit/date-picker";
import type { AdminDateRange, RangePreset } from "./use-date-range";
import { shortBusinessDateWithYear } from "./use-date-range";

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

export function AdminDateRangeControl({
  range,
  today,
  onPreset,
  onCustomDay,
  onCustomRange,
  className,
}: {
  range: AdminDateRange;
  /** Africa/Nairobi today — the max selectable custom day/range end. */
  today: string;
  onPreset: (preset: Exclude<RangePreset, "custom">) => void;
  onCustomDay: (ymd: string) => void;
  /** Given when the screen supports a real Custom `from`..`to` range
   *  (rather than a single custom day). When omitted, Custom shows the
   *  single-day `<DatePicker>` as before. */
  onCustomRange?: (from: string, to: string) => void;
  className?: string;
}) {
  const handleSegment = React.useCallback(
    (label: string) => {
      const preset = LABEL_TO_PRESET[label];
      if (preset === "custom") {
        // Entering Custom mode keeps the current range/day as-is.
        if (onCustomRange) onCustomRange(range.from, range.to);
        else onCustomDay(range.to);
      } else {
        onPreset(preset);
      }
    },
    [onPreset, onCustomDay, onCustomRange, range.from, range.to],
  );

  return (
    <div className={`flex items-center gap-(--sp-4) w-full md:w-auto ${className ?? ""}`}>
      <SegmentedControl
        aria-label="Date range"
        options={OPTIONS}
        value={PRESET_LABELS[range.preset]}
        onChange={handleSegment}
      />
      {range.preset === "custom" &&
        (onCustomRange ? (
          <div className="flex items-center gap-(--sp-3)">
            <DatePicker
              value={shortBusinessDateWithYear(range.from)}
              selected={dateOf(range.from)}
              maxDate={dateOf(today)}
              onSelect={(d) => onCustomRange(ymdOf(d), range.to)}
              aria-label="Custom range start date"
            />
            <span className="font-ui [color:var(--text-tertiary)] text-sm/sm" aria-hidden>
              –
            </span>
            <DatePicker
              value={shortBusinessDateWithYear(range.to)}
              selected={dateOf(range.to)}
              minDate={dateOf(range.from)}
              maxDate={dateOf(today)}
              onSelect={(d) => onCustomRange(range.from, ymdOf(d))}
              aria-label="Custom range end date"
            />
          </div>
        ) : (
          <DatePicker
            value={shortBusinessDateWithYear(range.to)}
            selected={dateOf(range.to)}
            maxDate={dateOf(today)}
            onSelect={(d) => onCustomDay(ymdOf(d))}
            aria-label="Custom business date"
          />
        ))}
    </div>
  );
}
