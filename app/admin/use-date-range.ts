"use client";

// M3 S7 (Financials) — the date-range control state, shared with
// `/admin` v2 (Session B — Dashboard). Originally
// `use-financials-range.ts` / `FinancialsRange` / `useFinancialsRange`;
// promoted out of `financials/` and renamed to `AdminDateRange` /
// `useAdminDateRange` when the Dashboard needed the identical control
// (v2 Session B) — Financials imports from here now too, nothing about
// its behaviour changed.
//
// ONE control drives a screen. It resolves a preset (or a custom single
// day) to an inclusive `{ from, to }` pair of Africa/Nairobi business
// dates (lib/time — never server-local). That pair then feeds BOTH kinds
// of figure on a screen, differently (ADR-57):
//
//   • FLOWS  (revenue, COGS, profit, expenses, the transaction tables)
//            accumulate over the WHOLE range → from..to.
//   • BALANCES (cash, M-Pesa/bank, debts owed, owed by owner) are a level
//            at one instant → read "as of the end of `to`".
//
// The domain does the balance/flow split itself
// (`getFinancialSummary(from, to)`); this hook's only job is to turn the
// preset into the range and expose an as-of label for the UI.
//
// Weeks are Monday–Sunday (ISO 8601 / local trading-week convention) —
// `businessWeekRange` in lib/time.

import * as React from "react";
import {
  businessMonthRange,
  businessWeekRange,
  nairobiToday,
} from "@/lib/time";

export type RangePreset = "today" | "week" | "month" | "custom";

export type AdminDateRange = {
  preset: RangePreset;
  /** Inclusive `YYYY-MM-DD` Africa/Nairobi business dates. */
  from: string;
  to: string;
};

/** `YYYY-MM-DD` → e.g. "7 Sep" (day-of-month + short month, no year). */
export function shortBusinessDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** `YYYY-MM-DD` → e.g. "7 Sep 2026". */
export function shortBusinessDateWithYear(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** The range a preset resolves to, anchored on the given "today". */
export function resolvePreset(
  preset: Exclude<RangePreset, "custom">,
  today: string = nairobiToday(),
): { from: string; to: string } {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return businessWeekRange(today);
    case "month":
      return businessMonthRange(today);
  }
}

/** A human label for the active range, for the header / captions. */
export function rangeLabel(range: AdminDateRange): string {
  if (range.from === range.to) return shortBusinessDateWithYear(range.from);
  return `${shortBusinessDate(range.from)} – ${shortBusinessDateWithYear(range.to)}`;
}

export function useAdminDateRange(): {
  range: AdminDateRange;
  /** Switch to a preset (today / this week / this month). */
  setPreset: (preset: Exclude<RangePreset, "custom">) => void;
  /** Pick a single custom business day (`from === to`). */
  setCustomDay: (ymd: string) => void;
  /** Today, Africa/Nairobi — the max selectable custom day. */
  today: string;
} {
  const today = React.useMemo(() => nairobiToday(), []);
  const [range, setRange] = React.useState<AdminDateRange>(() => ({
    preset: "today",
    ...resolvePreset("today", today),
  }));

  const setPreset = React.useCallback(
    (preset: Exclude<RangePreset, "custom">) => {
      setRange({ preset, ...resolvePreset(preset, today) });
    },
    [today],
  );

  const setCustomDay = React.useCallback((ymd: string) => {
    setRange({ preset: "custom", from: ymd, to: ymd });
  }, []);

  return { range, setPreset, setCustomDay, today };
}
