"use client";

// v2 Session B — `/admin` morning-triage dashboard, restructured around a
// period control. Approved design: Paper "Prosper Hotel" · page "M5 —
// Dashboard & Audit", `Dashboard — desktop [v2]` + `Dashboard — mobile
// [v2]`. Spec: docs/design/flows/dashboard-screen.md ("Structure (v2 —
// current)" — build against that, NOT the superseded M5 section further
// down the same doc).
//
// Still the owner's morning screen and pre-close review, but now also
// carries the profit narrative for whatever period she's looking at (a
// period `<SegmentedControl>` — Today / This week / This month / Custom
// — sits in the header, same control as Financials). The now/period
// split (dashboard-screen.md, "The now/period split") is the screen's
// central idea: the "Right now" zone (position/balances) stays
// `--color-accent`-bordered and unaffected by the period control; every
// other period-scoped zone flows with it.
//
// Two reads divide the page (Session A's decision, docs/API.md
// "Dashboard" v2 note — do not relitigate):
//   - GET /api/admin/dashboard (useDashboard, ?date= only) — Right now,
//     Stock & activity by location, Needs attention, Today's activity,
//     Day Close, the always-30-days trend card. Never period-driven.
//   - GET /api/financials/summary?from=&to= (useFinancialSummary, reused
//     from Financials) — the profit stack, Owner draws, Financial
//     performance by location. ALL period-driven, called twice (current
//     + prior-equivalent period) for the Net Profit delta caption.
//   - GET /api/admin/dashboard/trend?from=&to= (useDashboardTrend, new
//     this session) — the period trend bar strip only; bucketed
//     client-side (daily vs. weekly, see `bucketTrendByPeriod`).
//
// Zone order (desktop AND mobile — v2 does not reorder between them,
// unlike M5): profit stack · Right now · trend row (mobile: 30-day card
// only) · Financial performance by location + Stock & activity by
// location · Needs attention · Today's activity · Day Close.

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { ErrorState } from "@/components/kit/error-state";
import type {
  DashboardView,
  DashboardNeedsAttention,
  StockActivityByLocation,
} from "@/lib/domain/dashboard";
import type { FinancialSummary, LocationFinancials } from "@/lib/domain/financials";
import { AdminDateRangeControl } from "./date-range-control";
import { useAdminDateRange, type AdminDateRange } from "./use-date-range";
import { useFinancialSummary } from "./financials/use-financials";
import { addBusinessDays, businessWeekRange } from "@/lib/time";
import { DayCloseRow } from "./day-close/day-close-client";
import { useDashboard } from "./use-dashboard";
import { useDashboardTrend } from "./use-dashboard-trend";

// ── format helpers (screen-local; money is a decimal string at the wire) ──

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}
/** "2026-09-03" → "Wed, 3 Sep 2026". */
function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dow = DOW[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
  return `${dow}, ${d} ${MONTHS[m - 1]} ${y}`;
}
/** "2026-09-03" → "Wed 3 Sep". */
function shortDow(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dow = DOW[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
  return `${dow} ${d} ${MONTHS[m - 1]}`;
}
/** "2026-09-02" → "Tue, 2 Sep 2026" (needs-attention detail line). */
function midDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dow = DOW[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
  return `${dow}, ${d} ${MONTHS[m - 1]} ${y}`;
}
/** "2026-09-01" → "1 Sep". */
function dayMon(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

// ── shared bits ──────────────────────────────────────────────────────────

/** A section caption ("POSITION RIGHT NOW"), tertiary uppercase 12px. */
function Caption({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] text-caption/caption ${
        accent ? "[color:var(--color-accent)]" : "[color:var(--text-tertiary)]"
      }`}
    >
      {children}
    </span>
  );
}

/** An onward `Label →` link in accent, 13px medium. */
function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/sm no-underline hover:underline"
    >
      {children}
    </Link>
  );
}

// ── Zone — For <period> (profit stack) ─────────────────────────────────

/** The period label the profit-stack caption + prior-period comparison
 *  need — "This week · Mon 1 – Wed 3 Sep" style, following the period
 *  control's own preset label rather than reusing Financials' generic
 *  `rangeLabel` (the design wants "FOR THIS WEEK", not a bare date span). */
function periodCaption(range: AdminDateRange): string {
  const spanLabel =
    range.from === range.to
      ? shortDow(range.from)
      : `${shortDow(range.from)} – ${shortDow(range.to)}`;
  const noun =
    range.preset === "today"
      ? "today"
      : range.preset === "week"
        ? "this week"
        : range.preset === "month"
          ? "this month"
          : "this period";
  return `For ${noun} · ${spanLabel}`;
}

/** The prior-equivalent range for the delta caption — same span length,
 *  shifted back by one period (a week for Today/Week, a month for Month,
 *  the same number of days for Custom). Mirrors the M5 week band's
 *  "same point last week" comparison, generalised to every preset. */
function priorPeriodRange(range: AdminDateRange): { from: string; to: string } {
  if (range.preset === "month") {
    // Same weekday-of-month span, one calendar month back — approximated
    // as "30 days back" (a fixed-length shift), since business months
    // vary in length and the design only asks for a rough "by this point
    // last month" comparison, not calendar-exact alignment.
    return {
      from: addBusinessDays(range.from, -30),
      to: addBusinessDays(range.to, -30),
    };
  }
  const spanDays =
    (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) /
    86_400_000;
  const shift = range.preset === "today" || range.preset === "week" ? 7 : spanDays + 1;
  return {
    from: addBusinessDays(range.from, -shift),
    to: addBusinessDays(range.to, -shift),
  };
}

function StackCol({
  label,
  dec,
  sub,
  op,
}: {
  label: string;
  dec: string;
  sub?: string;
  op?: string;
}) {
  return (
    <div className="grow basis-0 flex flex-col gap-(--sp-2) py-(--sp-6) px-(--sp-7)">
      <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/[14px]">
        {op ? `${op} ` : ""}
        {label}
      </span>
      <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
        {money(dec)}
      </span>
      {sub && (
        <span className="font-ui [color:var(--text-disabled)] text-caption/micro">
          {sub}
        </span>
      )}
    </div>
  );
}

function NetProfitCol({
  net: dec,
  priorNet,
  periodLabel,
}: {
  net: string;
  priorNet: string | null;
  periodLabel: string;
}) {
  const n = Number(dec);
  const negative = n < 0;
  let delta: React.ReactNode = null;
  if (priorNet !== null) {
    const p = Number(priorNet);
    const up = n >= p;
    delta = (
      <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
        {up ? "▲" : "▼"} was {p < 0 ? "− " : "+ "}
        {money(Math.abs(p).toFixed(2))} by this point {periodLabel}
      </span>
    );
  }
  return (
    <div
      className={`grow basis-0 flex flex-col gap-(--sp-2) py-(--sp-6) px-(--sp-7) rounded-r-md ${
        negative ? "[background-color:var(--color-danger-bg)]" : "[background-color:var(--color-success-bg)]"
      }`}
    >
      <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-secondary)] text-micro/[14px]">
        Net profit
      </span>
      <span
        className={`font-mono font-(--weight-semibold) text-h1/h1 ${
          negative ? "text-danger" : "text-success"
        }`}
      >
        {negative ? "− " : ""}
        {money(Math.abs(n).toFixed(2))}
      </span>
      {delta}
    </div>
  );
}

/** Mobile: label-left / value-right stacked rows, Net profit emphasised. */
function MStackRow({ label, dec, op }: { label: string; dec: string; op?: string }) {
  return (
    <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
        {op ? `${op} ` : ""}
        {label}
      </span>
      <span className="font-mono [color:var(--text-primary)] text-sm/sm">{money(dec)}</span>
    </div>
  );
}

function ProfitStackZone({
  range,
  summary,
  loading,
  error,
  onRetry,
  priorNetProfit,
  priorPeriodLabel,
}: {
  range: AdminDateRange;
  summary: FinancialSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  priorNetProfit: string | null;
  priorPeriodLabel: string;
}) {
  const caption = periodCaption(range);
  const c = summary?.consolidated;

  return (
    <section className="flex flex-col shrink-0 gap-(--sp-5)">
      <div className="flex items-baseline gap-(--sp-4)">
        <span className="grow">
          <Caption>{caption}</Caption>
        </span>
        <Link
          href="/admin/financials"
          className="shrink-0 font-ui font-(--weight-medium) [color:var(--color-accent)] text-caption/caption no-underline hover:underline"
        >
          <span className="hidden md:inline">Full transactions in Financials →</span>
          <span className="md:hidden">Financials →</span>
        </Link>
      </div>

      {error ? (
        <ErrorState title="Couldn't load the profit summary" description={error} onRetry={onRetry} />
      ) : loading && !c ? (
        <div className="kit-skeleton h-[112px] w-full rounded-md" />
      ) : c ? (
        <>
          {/* Desktop: 5 hairline-split columns. */}
          <div className="hidden md:flex rounded-md [background-color:var(--surface-page)] border border-solid [border-color:var(--border-subtle)]">
            <StackCol label="Revenue" dec={c.revenue} sub="Orders + canteen sales, at selling price" />
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
            <StackCol label="Cost of goods sold" dec={c.cogs} op="−" sub="Opening + purchases − closing, by kind" />
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
            <StackCol label="Gross profit" dec={c.grossProfit} sub="Revenue − COGS" />
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
            <StackCol label="Expenses" dec={c.totalExpenses} op="−" sub="Logged this period" />
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
            <NetProfitCol net={c.netProfit} priorNet={priorNetProfit} periodLabel={priorPeriodLabel} />
          </div>

          {/* Mobile: stacked rows, Net profit the emphasised bottom row. */}
          <div className="md:hidden flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)]">
            <MStackRow label="Revenue" dec={c.revenue} />
            <MStackRow label="Cost of goods sold" dec={c.cogs} op="−" />
            <MStackRow label="Gross profit" dec={c.grossProfit} />
            <MStackRow label="Expenses" dec={c.totalExpenses} op="−" />
            <div
              className={`flex items-baseline justify-between py-(--sp-4) px-(--sp-5) ${
                Number(c.netProfit) < 0 ? "[background-color:var(--color-danger-bg)]" : "[background-color:var(--color-success-bg)]"
              }`}
            >
              <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
                Net profit
              </span>
              <span
                className={`font-mono font-(--weight-semibold) text-h2/[20px] ${
                  Number(c.netProfit) < 0 ? "text-danger" : "text-success"
                }`}
              >
                {Number(c.netProfit) < 0 ? "− " : ""}
                {money(Math.abs(Number(c.netProfit)).toFixed(2))}
              </span>
            </div>
          </div>

          {/* Owner draws — a slim row below the stack, same card language. */}
          <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-6) rounded-md [background-color:var(--surface-subtle)]">
            <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
              Owner draws{" "}
              {range.preset === "today"
                ? "today"
                : range.preset === "week"
                  ? "this week"
                  : range.preset === "month"
                    ? "this month"
                    : "this period"}{" "}
              · money the owner has taken out
            </span>
            <span className="font-mono [color:var(--text-primary)] text-sm/sm">
              KES {money(c.ownerDrawsForPeriod)}
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}

// ── Zone — Right now (position) ─────────────────────────────────────────

function RightNowZone({ position }: { position: DashboardView["position"] }) {
  const cols: { label: string; dec: string; tone: string }[] = [
    { label: "Total business liquidity", dec: position.liquidity, tone: "[color:var(--text-primary)]" },
    { label: "Cash at hand", dec: position.cash, tone: "[color:var(--color-success)]" },
    { label: "M-Pesa / Bank till", dec: position.mpesaBank, tone: "[color:var(--color-info)]" },
    { label: "Owed back by the owner", dec: position.ownerOwedToBusiness, tone: "[color:var(--color-danger)]" },
  ];
  return (
    <section className="flex flex-col shrink-0 gap-(--sp-4)">
      <Caption accent>Right now · not affected by the date range above</Caption>
      <div className="flex flex-col shrink-0 gap-(--sp-4) rounded-md [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)] border-t-2 [border-top-color:var(--color-accent)] py-(--sp-6) px-(--sp-7)">
        {/* Desktop: 4 columns, hairline vertical rules. */}
        <div className="hidden md:flex">
          {cols.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && (
                <div className="w-px self-stretch shrink-0 [background-color:var(--border-strong)]" />
              )}
              <div
                className={`flex flex-col gap-(--sp-3) ${
                  i === 0 ? "pr-(--sp-9)" : i === cols.length - 1 ? "pl-(--sp-9)" : "px-(--sp-9)"
                }`}
              >
                <Caption>{c.label}</Caption>
                <span className={`font-mono font-(--weight-semibold) text-display/display ${c.tone}`}>
                  KES {money(c.dec)}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Mobile: liquidity full-width, then Cash + M-Pesa 2-up, then Owed. */}
        <div className="md:hidden flex flex-col">
          <div className="flex flex-col gap-(--sp-1) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/micro">
              {cols[0].label}
            </span>
            <span className="font-mono font-(--weight-semibold) text-h1/h1 [color:var(--text-primary)]">
              KES {money(cols[0].dec)}
            </span>
          </div>
          <div className="flex gap-(--sp-5) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            {cols.slice(1, 3).map((c) => (
              <div key={c.label} className="grow basis-0 flex flex-col gap-(--sp-1)">
                <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/micro">
                  {c.label === "M-Pesa / Bank till" ? "M-Pesa / Bank" : c.label}
                </span>
                <span className={`font-mono font-(--weight-semibold) text-body/body ${c.tone}`}>
                  {money(c.dec)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-(--sp-1) pt-(--sp-4)">
            <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/micro">
              {cols[3].label}
            </span>
            <span className="font-mono font-(--weight-semibold) text-body/body [color:var(--color-danger)]">
              {money(cols[3].dec)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Zone — Trend charts (a row) ──────────────────────────────────────────

/** One bar of a strip. `null` net → faded stub (future day). */
function Bar({ net, maxAbs, width }: { net: string | null; maxAbs: number; width: string }) {
  if (net === null) {
    return (
      <div
        className={`shrink-0 rounded-[2px] [background-color:var(--border-strong)] ${width}`}
        style={{ height: 7, opacity: 0.35 }}
      />
    );
  }
  const n = Number(net);
  const pct = maxAbs > 0 ? Math.abs(n) / maxAbs : 0;
  const h = Math.max(4, Math.round(pct * 72));
  return (
    <div
      className={`shrink-0 rounded-[2px] ${width} ${
        n < 0 ? "[background-color:var(--color-danger)]" : "[background-color:var(--color-success)]"
      }`}
      style={{ height: h }}
    />
  );
}

/**
 * Bucket the period trend's daily series into the bars the strip draws.
 *
 * - Today / This week → one bar per day (carries the M5 week-strip
 *   look forward, just re-titled from the period label).
 * - This month → one bar per ISO (Monday-first) week the range touches,
 *   summed — ≈4–5 bars instead of ~30 daily ones crammed into the same
 *   card width.
 * - Custom → daily under `CUSTOM_DAILY_THRESHOLD_DAYS` days (a short
 *   custom span reads better as individual days), weekly at or above it —
 *   mirrors the Today/Week vs. Month split. Financials' Custom preset is
 *   always a single day today (`use-date-range.ts`), so in practice this
 *   branch only fires if Custom ever grows a real range picker; the
 *   threshold is picked to match that eventual Today/Week/Month split
 *   rather than to serve a case that exists yet.
 */
const CUSTOM_DAILY_THRESHOLD_DAYS = 14;

export type TrendBar = { label: string; net: string | null };

export function bucketTrendByPeriod(
  range: AdminDateRange,
  dailyNet: { date: string; net: string }[],
): TrendBar[] {
  if (range.preset === "today" || range.preset === "week") {
    return dailyNet.map((d) => ({
      label: DOW[(new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7],
      net: d.net,
    }));
  }

  const spanDays =
    (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) /
      86_400_000 +
    1;
  const wantsWeekly =
    range.preset === "month" || spanDays >= CUSTOM_DAILY_THRESHOLD_DAYS;

  if (!wantsWeekly) {
    return dailyNet.map((d) => ({
      label: String(Number(d.date.slice(8, 10))),
      net: d.net,
    }));
  }

  // Bucket into Monday-first ISO weeks touching the range.
  const byWeek = new Map<string, { sum: number; from: string; to: string }>();
  for (const d of dailyNet) {
    const { from: weekFrom } = businessWeekRange(d.date);
    const cur = byWeek.get(weekFrom);
    const n = Number(d.net);
    if (cur) {
      cur.sum += n;
      if (d.date > cur.to) cur.to = d.date;
    } else {
      byWeek.set(weekFrom, { sum: n, from: weekFrom, to: d.date });
    }
  }
  return [...byWeek.values()]
    .sort((a, b) => (a.from < b.from ? -1 : 1))
    .map((w) => ({
      label: `${dayMon(w.from)}–${dayMon(w.to)}`,
      net: w.sum.toFixed(2),
    }));
}

function PeriodTrendCard({
  range,
  bars,
  loading,
  error,
  onRetry,
}: {
  range: AdminDateRange;
  bars: TrendBar[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const maxAbs = Math.max(1, ...bars.map((b) => (b.net === null ? 0 : Math.abs(Number(b.net)))));
  const titleNoun =
    range.preset === "today"
      ? "TODAY"
      : range.preset === "week"
        ? "THIS WEEK"
        : range.preset === "month"
          ? "THIS MONTH"
          : "THIS PERIOD";
  return (
    <div className="grow basis-0 md:min-w-[300px] flex flex-col gap-(--sp-5) rounded-md [background-color:var(--surface-page)] border border-solid [border-color:var(--border-subtle)] py-(--sp-6) px-(--sp-7)">
      {/* h-[32px] matches ThirtyDayTrendCard's caption+total row height, so
          the bar area below starts at the same Y in both cards even though
          this card's caption has no inline figure next to it. */}
      <div className="flex items-center h-[32px]">
        <Caption>Net profit per day — {titleNoun}</Caption>
      </div>
      {error ? (
        <ErrorState title="Couldn't load the trend" description={error} onRetry={onRetry} />
      ) : loading && bars.length === 0 ? (
        <div className="kit-skeleton h-[100px] w-full rounded-md" />
      ) : (
        <>
          {/* Bars container is its own fixed-height box with the baseline
              border directly on it — same shape as ThirtyDayTrendCard's bar
              area (h-[120px] + border-b there) — so both cards' baselines
              land on the same row regardless of card height. The label row
              is a separate sibling below, not sharing this box, matching
              how the 30-day card keeps its date labels outside the bars. */}
          <div className="h-[120px] flex items-end gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-strong)]">
            {bars.map((b, i) => (
              <div key={`${b.label}-${i}`} className="flex-1 flex justify-center">
                <Bar net={b.net} maxAbs={maxAbs} width="w-[26px]" />
              </div>
            ))}
          </div>
          <div className="flex gap-(--sp-4)">
            {bars.map((b, i) => (
              <span
                key={`${b.label}-${i}`}
                className="flex-1 text-center font-ui text-[10px]/[12px] [color:var(--text-tertiary)] whitespace-nowrap"
              >
                {b.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ThirtyDayTrendCard({ trend }: { trend: DashboardView["trend"] }) {
  const total = Number(trend.net30Total);
  const maxAbs = Math.max(1, ...trend.dailyNet.map((d) => Math.abs(Number(d.net))));
  const first = trend.dailyNet[0]?.date;
  const last = trend.dailyNet.at(-1)?.date;
  return (
    <div className="grow basis-0 md:min-w-[420px] flex flex-col gap-(--sp-5) rounded-md [background-color:var(--surface-page)] border border-solid [border-color:var(--border-subtle)] py-(--sp-6) px-(--sp-7)">
      <div className="flex items-baseline justify-between gap-(--sp-4)">
        <Caption>Net profit — last 30 days</Caption>
        <span
          className={`font-mono font-(--weight-semibold) text-display/display ${
            total < 0 ? "text-danger" : "text-success"
          }`}
        >
          {total < 0 ? "− " : "+ "}KES {money(Math.abs(total).toFixed(2))}
        </span>
      </div>
      <div className="flex items-end gap-[3px] h-[120px] pt-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-strong)]">
        {trend.dailyNet.map((d) => (
          <div
            key={d.date}
            className={`grow basis-0 rounded-[1px] ${
              Number(d.net) < 0 ? "[background-color:var(--color-danger)]" : "[background-color:var(--color-success)]"
            }`}
            style={{
              height: Math.max(4, Math.round((Math.abs(Number(d.net)) / maxAbs) * 84)),
            }}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
          {first ? dayMon(first) : ""}
        </span>
        <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
          {last ? dayMon(last) : ""}
        </span>
      </div>
    </div>
  );
}

function TrendRow({
  range,
  bars,
  trendLoading,
  trendError,
  onRetryTrend,
  trend,
}: {
  range: AdminDateRange;
  bars: TrendBar[];
  trendLoading: boolean;
  trendError: string | null;
  onRetryTrend: () => void;
  trend: DashboardView["trend"];
}) {
  return (
    <section className="flex flex-wrap items-stretch gap-(--sp-7)">
      {/* Period trend — desktop only (owner-approved cut, dashboard-screen.md
          "Mobile" note under Trend charts: the profit-stack numbers already
          answer "how did we do" without a second chart on a long mobile page). */}
      <div className="hidden md:flex md:flex-1">
        <PeriodTrendCard
          range={range}
          bars={bars}
          loading={trendLoading}
          error={trendError}
          onRetry={onRetryTrend}
        />
      </div>
      <ThirtyDayTrendCard trend={trend} />
    </section>
  );
}

// ── Zone — Financial performance by location (table) ────────────────────

function FinancialLocationTable({ rows }: { rows: LocationFinancials[] }) {
  const total = rows.reduce(
    (acc, l) => ({
      revenue: acc.revenue + Number(l.revenue),
      cogs: acc.cogs + Number(l.cogs),
      grossProfit: acc.grossProfit + Number(l.grossProfit),
    }),
    { revenue: 0, cogs: 0, grossProfit: 0 },
  );
  return (
    <div className="flex flex-col rounded-md overflow-clip bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]">
      <div className="hidden md:flex items-center py-(--sp-3) px-(--sp-5) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="grow font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Location
        </div>
        {["Revenue", "COGS", "Gross"].map((h) => (
          <div
            key={h}
            className="w-[110px] shrink-0 text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro"
          >
            {h}
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="py-(--sp-6) px-(--sp-5) font-ui [color:var(--text-tertiary)] text-sm/sm">
          No location activity for this period.
        </div>
      ) : (
        rows.map((l) => (
          <div key={l.locationId}>
            {/* Desktop row */}
            <div className="hidden md:flex items-center py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="grow font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                {l.locationName}
              </div>
              <div className="w-[110px] shrink-0 text-right font-mono [color:var(--text-primary)] text-sm/sm">
                {money(l.revenue)}
              </div>
              <div className="w-[110px] shrink-0 text-right font-mono [color:var(--text-primary)] text-sm/sm">
                {money(l.cogs)}
              </div>
              <div
                className={`w-[110px] shrink-0 text-right font-mono font-(--weight-semibold) text-sm/sm ${
                  Number(l.grossProfit) < 0 ? "text-danger" : "[color:var(--text-primary)]"
                }`}
              >
                {money(l.grossProfit)}
              </div>
            </div>
            {/* Mobile row */}
            <div className="md:hidden flex items-baseline justify-between py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="flex flex-col gap-[2px]">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                  {l.locationName}
                </span>
                <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                  Rev {money(l.revenue)} · COGS {money(l.cogs)}
                </span>
              </div>
              <span
                className={`font-mono font-(--weight-semibold) text-sm/sm ${
                  Number(l.grossProfit) < 0 ? "text-danger" : "[color:var(--text-primary)]"
                }`}
              >
                {money(l.grossProfit)}
              </span>
            </div>
          </div>
        ))
      )}
      {rows.length > 0 && (
        <div className="flex items-center justify-between py-(--sp-4) px-(--sp-5) [background-color:var(--surface-subtle)]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            Total
          </span>
          <div className="hidden md:flex">
            <span className="w-[110px] shrink-0 text-right font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
              {money(total.revenue.toFixed(2))}
            </span>
            <span className="w-[110px] shrink-0 text-right font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
              {money(total.cogs.toFixed(2))}
            </span>
            <span className="w-[110px] shrink-0 text-right font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
              {money(total.grossProfit.toFixed(2))}
            </span>
          </div>
          <span className="md:hidden font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            {money(total.grossProfit.toFixed(2))}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Zone — Stock & activity by location (table) ──────────────────────────

function HandoverPip({ status }: { status: StockActivityByLocation["handoverStatus"] }) {
  if (status === null) {
    return <span className="font-ui [color:var(--text-disabled)] text-micro/micro">—</span>;
  }
  const received = status === "received";
  return (
    <span
      className={`inline-flex items-center gap-(--sp-2) font-ui font-(--weight-medium) text-micro/micro ${
        received ? "text-success" : "text-warning"
      }`}
    >
      <span
        className={`w-[6px] h-[6px] rounded-full shrink-0 ${received ? "bg-success" : "bg-warning"}`}
      />
      {received ? "Received" : "Awaiting"}
    </span>
  );
}

function StockActivityTable({ rows }: { rows: StockActivityByLocation[] }) {
  const total = rows.reduce(
    (acc, l) => ({
      movementCount: acc.movementCount + l.movementCount,
      lowStockCount: acc.lowStockCount + l.lowStockCount,
    }),
    { movementCount: 0, lowStockCount: 0 },
  );
  return (
    <div className="flex flex-col rounded-md overflow-clip bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]">
      <div className="hidden md:flex items-center py-(--sp-3) px-(--sp-5) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="grow font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Location
        </div>
        <div className="w-[110px] shrink-0 text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Movements
        </div>
        <div className="w-[110px] shrink-0 text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Low stock
        </div>
        <div className="w-[110px] shrink-0 text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Handover
        </div>
      </div>
      {rows.map((l) => (
        <div key={l.locationId}>
          {/* Desktop row */}
          <div className="hidden md:flex items-center py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <div className="grow font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
              {l.locationName}
            </div>
            <div className="w-[110px] shrink-0 text-right font-mono [color:var(--text-primary)] text-sm/sm">
              {l.movementCount}
            </div>
            <div
              className={`w-[110px] shrink-0 text-right font-mono text-sm/sm ${
                l.lowStockCount > 0 ? "text-danger" : "[color:var(--text-primary)]"
              }`}
            >
              {l.lowStockCount}
            </div>
            <div className="w-[110px] shrink-0 flex justify-end">
              <HandoverPip status={l.handoverStatus} />
            </div>
          </div>
          {/* Mobile row */}
          <div className="md:hidden flex items-center justify-between py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <div className="flex flex-col gap-[2px]">
              <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                {l.locationName}
              </span>
              <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                {l.movementCount} movements ·{" "}
                <span className={l.lowStockCount > 0 ? "text-danger" : undefined}>
                  {l.lowStockCount} low
                </span>
              </span>
            </div>
            <HandoverPip status={l.handoverStatus} />
          </div>
        </div>
      ))}
      {rows.length > 0 && (
        <div className="flex items-center justify-between py-(--sp-4) px-(--sp-5) [background-color:var(--surface-subtle)]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            Total
          </span>
          <div className="hidden md:flex">
            <span className="w-[110px] shrink-0 text-right font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
              {total.movementCount}
            </span>
            <span
              className={`w-[110px] shrink-0 text-right font-mono font-(--weight-semibold) text-sm/sm ${
                total.lowStockCount > 0 ? "text-danger" : "[color:var(--text-primary)]"
              }`}
            >
              {total.lowStockCount}
            </span>
            <span className="w-[110px] shrink-0" />
          </div>
          <span className="md:hidden font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            {total.movementCount} movements
          </span>
        </div>
      )}
    </div>
  );
}

function LocationTablesZone({
  range,
  perLocation,
  stockActivity,
}: {
  range: AdminDateRange;
  perLocation: LocationFinancials[];
  stockActivity: StockActivityByLocation[];
}) {
  const periodNoun =
    range.preset === "today"
      ? "Today"
      : range.preset === "week"
        ? "This week so far"
        : range.preset === "month"
          ? "This month so far"
          : "This period";
  return (
    <section className="flex flex-col md:flex-row items-start gap-(--sp-7)">
      <div className="flex-1 min-w-0 flex flex-col gap-(--sp-4)">
        <div className="flex flex-col gap-[2px]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Financial performance by location
          </span>
          <span className="font-ui [color:var(--text-disabled)] text-caption/micro">
            {periodNoun} · Store excluded, it doesn&apos;t sell
          </span>
        </div>
        <FinancialLocationTable rows={perLocation} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-(--sp-4)">
        <div className="flex flex-col gap-[2px]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Stock &amp; activity by location
          </span>
          <span className="font-ui [color:var(--text-disabled)] text-caption/micro">
            Today · always current, not the date range above
          </span>
        </div>
        <StockActivityTable rows={stockActivity} />
      </div>
    </section>
  );
}

// ── Zone — Needs attention ────────────────────────────────────────────────

type AttnRow = {
  key: string;
  danger?: boolean;
  title: string;
  detail: string;
  linkLabel: string;
  href: string;
  /** When set, the row's action opens the Day Close history drawer
   *  (scrolled/highlighted to this date) instead of navigating — there is
   *  no dedicated "review a day" route, and Day Close (bottom of this
   *  same page) is where an open prior date is actually closed. */
  onAction?: () => void;
};

function buildAttnRows(
  na: DashboardNeedsAttention,
  onReviewDay: (date: string) => void,
): AttnRow[] {
  const rows: AttnRow[] = [];

  if (na.openPriorDates.length > 0) {
    const n = na.openPriorDates.length;
    const first = na.openPriorDates[0];
    rows.push({
      key: "open-days",
      title: `${n} ${n === 1 ? "day" : "days"} still open before today`,
      detail:
        n === 1
          ? `${midDate(first)} — close it or amend it as a correction`
          : `earliest ${midDate(first)} — close each or amend as a correction`,
      linkLabel: "Review day →",
      href: "#day-close",
      onAction: () => onReviewDay(first),
    });
  }

  const awaiting = na.handoversAwaitingReceipt;
  if (awaiting.count > 0) {
    const it = awaiting.items[0];
    rows.push({
      key: "handovers-awaiting",
      title: `${awaiting.count} handover${awaiting.count === 1 ? "" : "s"} awaiting your receipt`,
      detail: it
        ? `${it.locationName} · declared KES ${money(it.declaredTotal)} by ${it.staffName}`
        : "open the Handovers tab to record the receipt",
      linkLabel: "Record receipt →",
      href: "/admin/financials?tab=handovers",
    });
  }

  const sf = na.openShortfalls;
  if (sf.count > 0) {
    rows.push({
      key: "shortfalls",
      title: `${sf.count} open handover shortfall${sf.count === 1 ? "" : "s"}`,
      detail: `KES ${money(sf.total)} total — settle separately with the staff member`,
      linkLabel: "Open handovers →",
      href: "/admin/financials?tab=handovers",
    });
  }

  const low = na.lowOrNegativeStock;
  if (low.count > 0) {
    const names = low.top
      .map((s) => {
        const q = Number(s.qty);
        return q < 0
          ? `${s.productName} ${q}`
          : `${s.productName} ${Number.isInteger(q) ? q : q.toFixed(1)} ${s.unit}`;
      })
      .join(" · ");
    rows.push({
      key: "low-stock",
      danger: true,
      title: `${low.count} item${low.count === 1 ? "" : "s"} low or negative on stock`,
      detail: names || "check the Ledger for the affected products",
      linkLabel: "Open stock →",
      href: "/admin/stock",
    });
  }

  return rows;
}

function NeedsAttentionZone({
  na,
  onReviewDay,
}: {
  na: DashboardNeedsAttention;
  onReviewDay: (date: string) => void;
}) {
  const rows = buildAttnRows(na, onReviewDay);
  const open = rows.length;

  return (
    <section className="flex flex-col shrink-0 gap-(--sp-4) md:gap-(--sp-5)">
      <div className="flex items-baseline gap-(--sp-4)">
        <span className="grow">
          <Caption>Needs attention</Caption>
        </span>
        {open > 0 && (
          <span className="shrink-0 font-mono font-(--weight-semibold) [color:var(--color-warning)] text-caption/caption">
            {open} open
          </span>
        )}
      </div>

      <div className="flex flex-col rounded-md overflow-clip border border-solid [border-color:var(--border-subtle)]">
        {open === 0 ? (
          <div className="flex items-center gap-(--sp-5) py-(--sp-5) px-(--sp-6)">
            <div className="w-[6px] h-[6px] shrink-0 rounded-full [background-color:var(--color-success)]" />
            <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
              All clear — nothing needs you before you close.
            </span>
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.key}
              className={`flex items-start md:items-center gap-(--sp-4) md:gap-(--sp-5) py-(--sp-5) px-(--sp-6) ${
                i < rows.length - 1
                  ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  : ""
              }`}
            >
              <div
                className={`w-[6px] h-[6px] shrink-0 rounded-full mt-[6px] md:mt-0 ${
                  r.danger ? "[background-color:var(--color-danger)]" : "[background-color:var(--color-warning)]"
                }`}
              />
              <div className="grow flex flex-col gap-[2px]">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm md:text-body/body">
                  {r.title}
                </span>
                <span className="font-ui [color:var(--text-secondary)] text-caption/caption">
                  <span className="hidden md:inline">{r.detail}</span>
                  <span className="md:hidden">
                    {r.detail} —{" "}
                    {r.onAction ? (
                      <button
                        type="button"
                        onClick={r.onAction}
                        className="font-(--weight-medium) [color:var(--color-accent)] no-underline hover:underline"
                      >
                        {r.linkLabel}
                      </button>
                    ) : (
                      <Link
                        href={r.href}
                        className="font-(--weight-medium) [color:var(--color-accent)] no-underline hover:underline"
                      >
                        {r.linkLabel}
                      </Link>
                    )}
                  </span>
                </span>
              </div>
              <span className="hidden md:block">
                {r.onAction ? (
                  <button
                    type="button"
                    onClick={r.onAction}
                    className="shrink-0 font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/sm no-underline hover:underline"
                  >
                    {r.linkLabel}
                  </button>
                ) : (
                  <ActionLink href={r.href}>{r.linkLabel}</ActionLink>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ── Zone — Today's activity ────────────────────────────────────────────────

function TodayZone({ today }: { today: DashboardView["today"] }) {
  const cells: {
    key: string;
    value: string;
    label: string;
    href?: string;
    mValue?: string;
    mLabel?: string;
  }[] = [
    { key: "sales", value: `KES ${money(today.salesSoFar)}`, label: "Sales so far →", href: "/admin/sales" },
    { key: "stock", value: String(today.stockMovementCount), label: "Stock movements →", href: "/admin/stock" },
    {
      key: "purchases",
      value: String(today.purchaseReceiptCount),
      label: "Purchases & receipts →",
      href: "/admin/financials?tab=purchases",
    },
    {
      key: "handovers",
      value: `${today.handoversReceived} / ${today.handoversDue}`,
      label: "Handovers received / due →",
      href: "/admin/financials?tab=handovers",
      mValue: String(today.handoversReceived + today.handoversDue),
      mLabel: `Handovers · ${today.handoversReceived} received · ${today.handoversDue} awaiting`,
    },
    {
      key: "corrections",
      value: String(today.correctionCountToday),
      label: "Correction today →",
      href: "/admin/audit-trail",
    },
  ];

  return (
    <section className="flex flex-col shrink-0 gap-(--sp-4) md:gap-(--sp-5)">
      <Caption>Today&apos;s activity · {shortDow(today.date)}</Caption>

      <div className="hidden md:flex rounded-md border border-solid [border-color:var(--border-subtle)]">
        {cells.map((c, i) => (
          <React.Fragment key={c.key}>
            {i > 0 && <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />}
            <div className="grow basis-0 flex flex-col gap-(--sp-2) py-(--sp-5) px-(--sp-6)">
              <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
                {c.value}
              </span>
              {c.href ? (
                <Link
                  href={c.href}
                  className="font-ui font-(--weight-medium) [color:var(--color-accent)] text-caption/caption no-underline hover:underline"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="font-ui [color:var(--text-secondary)] text-caption/caption">{c.label}</span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="md:hidden flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)]">
        {cells
          .filter((c) => c.key !== "sales")
          .map((c, i, arr) => (
            <div
              key={c.key}
              className={`flex items-center gap-(--sp-4) py-(--sp-5) px-(--sp-6) ${
                i < arr.length - 1 ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]" : ""
              }`}
            >
              <span className="w-[32px] shrink-0 font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[20px]">
                {c.mValue ?? c.value}
              </span>
              {c.mLabel ? (
                <span className="grow font-ui [color:var(--text-secondary)] text-sm/sm">{c.mLabel}</span>
              ) : (
                <Link
                  href={c.href ?? "#"}
                  className="grow font-ui font-(--weight-medium) [color:var(--color-accent)] text-sm/sm no-underline hover:underline"
                >
                  {c.label}
                </Link>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}

// ── The screen ────────────────────────────────────────────────────────────

export function DashboardClient() {
  const { data, loading, error, refresh } = useDashboard();
  const { range, setPreset, setCustomDay, today } = useAdminDateRange();

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useFinancialSummary(range.from, range.to);

  const prior = React.useMemo(() => priorPeriodRange(range), [range]);
  const { summary: priorSummary } = useFinancialSummary(prior.from, prior.to);

  // Today / This week both render the same full 7-bar week strip (spec:
  // "unchanged M5 week-strip look, just re-titled") — Today's own {from, to}
  // is a single day, which would otherwise fetch (and bucket to) just one
  // bar instead of the current business week.
  const trendRange =
    range.preset === "today" || range.preset === "week"
      ? businessWeekRange(today)
      : range;
  const {
    data: trendData,
    loading: trendLoading,
    error: trendError,
    refresh: refreshTrend,
  } = useDashboardTrend(trendRange.from, trendRange.to);

  const bars = React.useMemo(
    () => (trendData ? bucketTrendByPeriod(range, trendData.dailyNet) : []),
    [range, trendData],
  );

  const priorPeriodLabel =
    range.preset === "today"
      ? "yesterday"
      : range.preset === "week"
        ? "last week"
        : range.preset === "month"
          ? "last month"
          : "the prior period";

  const dateLabel = data ? longDate(data.date) : "";

  // "Review day →" (Needs attention) opens Day Close's history drawer,
  // scrolled/highlighted to the specific open date — there is no
  // dedicated "review a day" route, and Day Close is where an open prior
  // date is actually closed. A bump counter (not just the date) forces
  // DayCloseRow to reopen the drawer even if the same date is clicked
  // twice in a row.
  const [reviewDay, setReviewDay] = React.useState<{ date: string; nonce: number } | null>(
    null,
  );
  const onReviewDay = React.useCallback((date: string) => {
    setReviewDay((prev) => ({ date, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const rangeControl = (
    <AdminDateRangeControl range={range} today={today} onPreset={setPreset} onCustomDay={setCustomDay} />
  );

  return (
    <PageShell>
      <AdminPageHeader
        title="Dashboard"
        actions={
          <div className="flex items-center gap-(--sp-5)">
            {dateLabel && (
              <span className="hidden md:inline font-ui [color:var(--text-secondary)] text-sm/sm">
                {dateLabel}
              </span>
            )}
            <div className="hidden md:block">{rangeControl}</div>
          </div>
        }
      />

      {/* Mobile: range control gets its own row so the header stays uncrowded. */}
      <div className="md:hidden flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Showing
        </span>
        {rangeControl}
      </div>

      {error ? (
        <div className="pt-(--sp-6)">
          <ErrorState title="Couldn't load the dashboard" description={error} onRetry={refresh} />
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col gap-(--sp-6) pt-(--sp-6)">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kit-skeleton h-[112px] w-full rounded-md" />
          ))}
        </div>
      ) : data ? (
        <div className="flex flex-col gap-(--sp-8) pt-(--sp-2) pb-(--sp-10)">
          <ProfitStackZone
            range={range}
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            onRetry={refreshSummary}
            priorNetProfit={priorSummary?.consolidated.netProfit ?? null}
            priorPeriodLabel={priorPeriodLabel}
          />
          <RightNowZone position={data.position} />
          <TrendRow
            range={range}
            bars={bars}
            trendLoading={trendLoading}
            trendError={trendError}
            onRetryTrend={refreshTrend}
            trend={data.trend}
          />
          <LocationTablesZone
            range={range}
            perLocation={summary?.perLocation ?? []}
            stockActivity={data.stockActivity}
          />
          <NeedsAttentionZone na={data.needsAttention} onReviewDay={onReviewDay} />
          <TodayZone today={data.today} />
          <DayCloseRow
            openPriorDates={data.needsAttention.openPriorDates}
            highlightDate={reviewDay?.date}
            openHistorySignal={reviewDay?.nonce}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
