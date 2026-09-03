"use client";

// M4 S9B — the month picker for the Pay & advances tab.
//
// The frozen kit has NO month picker (same gap the Financials redesign
// hit — docs/design/flows/staff-screen.md "What the kit couldn't express").
// The agreed workaround: reuse the Financials approach — a trigger that
// opens a month LIST. Here that list is the kit <Select> (a styled
// dropdown) with one <option> per month, newest first, from `oldestMonths`
// back through the current Nairobi month. No new kit component.
//
// A future month is never offered — `payStaff` rejects it (ADR-60) and
// there is nothing to show.

import * as React from "react";
import { Select } from "@/components/kit/select";
import { nairobiToday } from "@/lib/time";

/** `YYYY-MM` → e.g. "September 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** The current Nairobi month as `YYYY-MM`. */
export function currentMonth(): string {
  return nairobiToday().slice(0, 7);
}

/** `count` months ending at (and including) `end` (`YYYY-MM`), newest first. */
function monthsBack(end: string, count: number): string[] {
  const [y, m] = end.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

export function MonthPicker({
  value,
  onChange,
  monthsShown = 15,
  className,
}: {
  value: string;
  onChange: (month: string) => void;
  monthsShown?: number;
  className?: string;
}) {
  const options = React.useMemo(() => {
    const months = monthsBack(currentMonth(), monthsShown);
    // If the selected month is somehow older than the window, include it.
    if (!months.includes(value)) months.push(value);
    return months.map((mo) => ({ value: mo, label: monthLabel(mo) }));
  }, [value, monthsShown]);

  return (
    <Select
      aria-label="Pay month"
      className={className ?? "w-[180px]"}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
