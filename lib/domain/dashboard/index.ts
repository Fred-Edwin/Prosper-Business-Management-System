// Public surface of the dashboard domain module (M5 S13 — the `/admin`
// morning-triage aggregator). Route handlers import from here:
//   import { getDashboard } from "@/lib/domain/dashboard";
//
// The module spans financials + audit + handovers + stock; it OWNS no
// entity of its own and writes NOTHING. Every figure is composed from an
// existing per-module read, except the daily net-profit series
// (`dailyNetSeries`, ADR-64) which is a fast bucketed re-derivation that
// agrees to the cent with `getFinancialSummary(day, day)`.

export { DomainError } from "@/lib/domain/financials/errors";
export * from "./types";
export { getDashboard } from "./get-dashboard";
export { dailyNetSeries, type DailyNet } from "./trend-series";
