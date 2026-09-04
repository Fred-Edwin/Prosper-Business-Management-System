"use client";

// M5 S14 — `/admin` morning-triage dashboard. Approved design: Paper
// "Prosper Hotel" · page "M5 — Dashboard & Audit", `Dashboard — desktop
// [M5]` + `Dashboard — mobile [M5]`. Spec:
// docs/design/flows/dashboard-screen.md.
//
// This is the owner's morning screen and their pre-close review — "is
// anything wrong, and is the business healthy right now?". There is NO
// period picker: every figure is "now", "today", or "this week so far".
// One read: GET /api/admin/dashboard (Admin-only), via useDashboard().
//
// Composed entirely from components/kit/* PLUS the two documented inline
// bar strips (the 7-bar week strip + the 30-bar trend) — plain flex
// `<div>` bars, no charting library, no new kit component (design doc
// "Charts — a deliberate exception"). The Day Close card is <DayCloseCard>
// unchanged from M3 S1 (ADR-52) — only its position on the page changed.
//
// Desktop band order (top→bottom): Position · This week so far · Needs
// attention · Today's activity · Day Close + 30-day trend.
// Mobile REORDERS: Position · This week so far · Today's activity · Needs
// attention · Day Close. (Today's activity moves ABOVE Needs attention.)

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { ErrorState } from "@/components/kit/error-state";
import type {
  DashboardView,
  DashboardWeek,
  WeekDayNet,
  TrendDayNet,
  DashboardNeedsAttention,
} from "@/lib/domain/dashboard";
import { DayCloseCard } from "./day-close/day-close-client";
import { useDashboard } from "./use-dashboard";

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
/** `KES 1,234.00`, negative → `− KES 1,234.00`. */
function kes(dec: string): string {
  const n = Number(dec);
  return `${n < 0 ? "− " : ""}KES ${money(Math.abs(Number(n)).toFixed(2))}`;
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
/** "2026-09-01" → "Mon 1". */
function dowNum(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dow = DOW[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
  return `${dow} ${d}`;
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
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-caption/caption">
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

// ── Band 1 — Position right now ──────────────────────────────────────────

function PositionBand({ position }: { position: DashboardView["position"] }) {
  const cols: { label: string; dec: string; tone: string }[] = [
    { label: "Total business liquidity", dec: position.liquidity, tone: "[color:var(--text-primary)]" },
    { label: "Cash at hand", dec: position.cash, tone: "[color:var(--color-success)]" },
    { label: "M-Pesa / Bank till", dec: position.mpesaBank, tone: "[color:var(--color-info)]" },
    { label: "Owed back by the owner", dec: position.ownerOwedToBusiness, tone: "[color:var(--color-danger)]" },
  ];
  return (
    <section className="flex flex-col shrink-0 gap-(--sp-4) rounded-md [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)] py-(--sp-6) px-(--sp-7)">
      <Caption>Position right now</Caption>

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
    </section>
  );
}

// ── Band 2 — This week so far ────────────────────────────────────────────

/** Signed % delta vs. the prior-week-to-date figure. Returns null when the
 *  prior figure is 0 (no base to compare). */
function pctDelta(now: string, prior: string): number | null {
  const p = Number(prior);
  if (!Number.isFinite(p) || p === 0) return null;
  return ((Number(now) - p) / Math.abs(p)) * 100;
}

/** One bar of the 7-bar week strip / 30-bar trend. `null` net → faded stub. */
function Bar({
  net,
  maxAbs,
  width,
}: {
  net: string | null;
  maxAbs: number;
  width: string;
}) {
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
  const h = Math.max(4, Math.round(pct * 72)); // 72px = full-height bar
  return (
    <div
      className={`shrink-0 rounded-[2px] ${width} ${
        n < 0 ? "[background-color:var(--color-danger)]" : "[background-color:var(--color-success)]"
      }`}
      style={{ height: h }}
    />
  );
}

function WeekStrip({ days, today }: { days: WeekDayNet[]; today: string }) {
  const maxAbs = Math.max(
    1,
    ...days.map((d) => (d.net === null ? 0 : Math.abs(Number(d.net)))),
  );
  return (
    <div className="flex items-end gap-(--sp-4)">
      {days.map((d) => {
        const [, , dd] = d.date.split("-");
        const isToday = d.date === today;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-(--sp-3)">
            <Bar net={d.net} maxAbs={maxAbs} width="w-[26px]" />
            <span
              className={`font-ui text-[10px]/[12px] ${
                isToday
                  ? "font-(--weight-medium) [color:var(--text-primary)]"
                  : "[color:var(--text-tertiary)]"
              }`}
            >
              {DOW[(new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7]}
              <span className="sr-only"> {dd}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeekFigure({
  label,
  dec,
  delta,
  kind,
}: {
  label: string;
  dec: string;
  delta: number | null;
  kind: "revenue" | "expenses";
}) {
  // Revenue: ▲ good (success). Expenses: ▲ bad (danger).
  let deltaNode: React.ReactNode;
  if (delta === null) {
    deltaNode = (
      <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
        no comparable point last week
      </span>
    );
  } else {
    const up = delta >= 0;
    const good = kind === "revenue" ? up : !up;
    deltaNode = (
      <span
        className={`font-ui text-caption/caption ${
          good ? "[color:var(--color-success)]" : "[color:var(--color-danger)]"
        }`}
      >
        {up ? "▲" : "▼"} {Math.abs(Math.round(delta))}% vs. same point last week
      </span>
    );
  }
  return (
    <div className="grow basis-0 flex flex-col justify-center gap-(--sp-2) py-(--sp-6) px-(--sp-7)">
      <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/[14px]">
        {label}
      </span>
      <span className="font-mono font-(--weight-regular) text-h1/h1 [color:var(--text-primary)]">
        KES {money(dec)}
      </span>
      {deltaNode}
    </div>
  );
}

/** Net profit tile's prose delta line: "▼ was + KES 4,100 by this point
 *  last week" / "▲ was − KES … by this point last week". */
function netProseLine(week: DashboardWeek): React.ReactNode {
  const now = Number(week.netWtd);
  const prior = Number(week.netPriorWtd);
  const up = now >= prior;
  return (
    <span className="font-ui [color:var(--color-danger)] text-caption/caption">
      {up ? "▲" : "▼"} was {prior < 0 ? "− " : "+ "}
      KES {money(Math.abs(prior).toFixed(2))} by this point last week
    </span>
  );
}

function WeekBand({ week }: { week: DashboardWeek }) {
  const from = week.dailyNet[0]?.date ?? week.from;
  // "Mon 1 – Wed 3 Sep" — last present (non-null) day is "so far".
  const present = week.dailyNet.filter((d) => d.net !== null);
  const last = present.at(-1)?.date ?? week.from;
  const today = last;
  const label = `This week so far · ${dowNum(from)} – ${shortDow(last)}`;

  const revDelta = pctDelta(week.revenueWtd, week.revenuePriorWtd);
  const expDelta = pctDelta(week.expensesWtd, week.expensesPriorWtd);

  return (
    <section className="flex flex-col shrink-0 gap-(--sp-5)">
      <div className="flex items-baseline gap-(--sp-4)">
        <span className="grow font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-caption/caption">
          <span className="hidden md:inline">{label}</span>
          <span className="md:hidden">This week so far</span>
        </span>
        <Link
          href="/admin/financials?tab=purchases"
          className="shrink-0 font-ui font-(--weight-medium) [color:var(--color-accent)] text-caption/caption no-underline hover:underline"
        >
          <span className="hidden md:inline">Full breakdown in Financials →</span>
          <span className="md:hidden">Financials →</span>
        </Link>
      </div>

      {/* Desktop: strip box on the left, three figure columns on the right. */}
      <div className="hidden md:flex rounded-md [background-color:var(--surface-page)] border border-solid [border-color:var(--border-subtle)]">
        <div className="flex flex-col gap-(--sp-4) py-(--sp-6) px-(--sp-7) border-r border-r-solid [border-right-color:var(--border-subtle)]">
          <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-micro/[14px]">
            Net profit per day
          </span>
          <div className="w-[244px]">
            <WeekStrip days={week.dailyNet} today={today} />
          </div>
        </div>
        <div className="grow flex">
          <WeekFigure label="Revenue" dec={week.revenueWtd} delta={revDelta} kind="revenue" />
          <WeekFigure label="Expenses" dec={week.expensesWtd} delta={expDelta} kind="expenses" />
          <div className="grow basis-0 flex flex-col justify-center gap-(--sp-2) py-(--sp-6) px-(--sp-7) [background-color:var(--surface-subtle)] rounded-r-md">
            <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-secondary)] text-micro/[14px]">
              Net profit
            </span>
            <span className="font-mono font-(--weight-semibold) text-display/display [color:var(--color-danger)]">
              {kes(week.netWtd)}
            </span>
            {netProseLine(week)}
          </div>
        </div>
      </div>

      {/* Mobile: full-width strip row, then three label-left / value-right rows. */}
      <div className="md:hidden flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)]">
        <div className="flex items-end justify-between gap-(--sp-3) py-(--sp-6) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <div className="grow">
            <WeekStrip days={week.dailyNet} today={today} />
          </div>
        </div>
        <MWeekRow label="Revenue" dec={week.revenueWtd} delta={revDelta} kind="revenue" />
        <MWeekRow label="Expenses" dec={week.expensesWtd} delta={expDelta} kind="expenses" />
        <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-5) [background-color:var(--surface-subtle)]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
            Net profit
          </span>
          <span className="font-mono font-(--weight-semibold) text-h2/[20px] [color:var(--color-danger)]">
            {kes(week.netWtd).replace("KES ", "")}
          </span>
        </div>
      </div>
    </section>
  );
}

function MWeekRow({
  label,
  dec,
  delta,
  kind,
}: {
  label: string;
  dec: string;
  delta: number | null;
  kind: "revenue" | "expenses";
}) {
  let deltaNode: React.ReactNode = null;
  if (delta !== null) {
    const up = delta >= 0;
    const good = kind === "revenue" ? up : !up;
    deltaNode = (
      <span
        className={`font-ui text-micro/[14px] ${
          good ? "[color:var(--color-success)]" : "[color:var(--color-danger)]"
        }`}
      >
        {up ? "▲" : "▼"} {Math.abs(Math.round(delta))}%
      </span>
    );
  }
  return (
    <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">{label}</span>
      <div className="flex items-baseline gap-(--sp-3)">
        <span className="font-mono [color:var(--text-primary)] text-sm/sm">{money(dec)}</span>
        {deltaNode}
      </div>
    </div>
  );
}

// ── Band 3 — Needs attention ─────────────────────────────────────────────

type AttnRow = {
  key: string;
  danger?: boolean;
  title: string;
  detail: string;
  linkLabel: string;
  href: string;
};

function buildAttnRows(na: DashboardNeedsAttention): AttnRow[] {
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
      href: "/admin",
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

function NeedsAttentionBand({ na }: { na: DashboardNeedsAttention }) {
  const rows = buildAttnRows(na);
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
            <div
              className="w-[6px] h-[6px] shrink-0 rounded-full [background-color:var(--color-success)]"
            />
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
                  r.danger
                    ? "[background-color:var(--color-danger)]"
                    : "[background-color:var(--color-warning)]"
                }`}
              />
              <div className="grow flex flex-col gap-[2px]">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm md:text-body/body">
                  {r.title}
                </span>
                {/* Desktop: detail only (link in its own lane). Mobile: detail + link inline. */}
                <span className="font-ui [color:var(--text-secondary)] text-caption/caption">
                  <span className="hidden md:inline">{r.detail}</span>
                  <span className="md:hidden">
                    {r.detail} —{" "}
                    <Link
                      href={r.href}
                      className="font-(--weight-medium) [color:var(--color-accent)] no-underline hover:underline"
                    >
                      {r.linkLabel}
                    </Link>
                  </span>
                </span>
              </div>
              <span className="hidden md:block">
                <ActionLink href={r.href}>{r.linkLabel}</ActionLink>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ── Band 4 — Today's activity ────────────────────────────────────────────

function TodayBand({ today }: { today: DashboardView["today"] }) {
  const cells: {
    key: string;
    value: string;
    label: string;
    href?: string;
    /** mobile-only value override (the desktop value can be too wide for the 32px slot) */
    mValue?: string;
    /** mobile readout label — replaces the linking label with a plain readout */
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
      <Caption>Today's activity · {shortDow(today.date)}</Caption>

      {/* Desktop: a row of hairline-split count cells. */}
      <div className="hidden md:flex rounded-md border border-solid [border-color:var(--border-subtle)]">
        {cells.map((c, i) => (
          <React.Fragment key={c.key}>
            {i > 0 && (
              <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
            )}
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
                <span className="font-ui [color:var(--text-secondary)] text-caption/caption">
                  {c.label}
                </span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Mobile: vertical list — value in a 32px left slot, label right.
          "Sales so far" is dropped on mobile (it leads the Position band's
          sibling read); the handovers row becomes a plain readout. */}
      <div className="md:hidden flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)]">
        {cells
          .filter((c) => c.key !== "sales")
          .map((c, i, arr) => (
            <div
              key={c.key}
              className={`flex items-center gap-(--sp-4) py-(--sp-5) px-(--sp-6) ${
                i < arr.length - 1
                  ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  : ""
              }`}
            >
              <span className="w-[32px] shrink-0 font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[20px]">
                {c.mValue ?? c.value}
              </span>
              {c.mLabel ? (
                <span className="grow font-ui [color:var(--text-secondary)] text-sm/sm">
                  {c.mLabel}
                </span>
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

// ── Band 5 — Day Close + 30-day trend ───────────────────────────────────

function TrendCard({ trend }: { trend: DashboardView["trend"] }) {
  const total = Number(trend.net30Total);
  const maxAbs = Math.max(
    1,
    ...trend.dailyNet.map((d: TrendDayNet) => Math.abs(Number(d.net))),
  );
  const first = trend.dailyNet[0]?.date;
  const last = trend.dailyNet.at(-1)?.date;
  return (
    <div className="grow basis-0 md:min-w-[420px] flex flex-col gap-(--sp-5) rounded-md [background-color:var(--surface-page)] border border-solid [border-color:var(--border-subtle)] py-(--sp-6) px-(--sp-7)">
      <div className="flex items-baseline justify-between gap-(--sp-4)">
        <Caption>Net profit — last 30 days</Caption>
        <span
          className={`font-mono font-(--weight-semibold) text-display/display ${
            total < 0 ? "[color:var(--color-danger)]" : "[color:var(--color-success)]"
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
              Number(d.net) < 0
                ? "[background-color:var(--color-danger)]"
                : "[background-color:var(--color-success)]"
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

function CloseTrendBand({ trend }: { trend: DashboardView["trend"] }) {
  return (
    <section className="flex flex-wrap items-start gap-(--sp-8)">
      <DayCloseCard className="flex-1 shrink-0 md:max-w-[560px]" />
      <TrendCard trend={trend} />
    </section>
  );
}

// ── The screen ──────────────────────────────────────────────────────────

export function DashboardClient() {
  const { data, loading, error, refresh } = useDashboard();

  const dateLabel = data ? longDate(data.date) : "";

  return (
    <PageShell>
      <AdminPageHeader
        title="Dashboard"
        actions={
          dateLabel ? (
            <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
              {dateLabel}
            </span>
          ) : undefined
        }
      />

      {error ? (
        <div className="pt-(--sp-6)">
          <ErrorState
            title="Couldn't load the dashboard"
            description={error}
            onRetry={refresh}
          />
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col gap-(--sp-6) pt-(--sp-6)">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kit-skeleton h-[112px] w-full rounded-md" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Mobile order: Position · This week · Today's activity · Needs attention · Day Close. */}
          <div className="md:hidden flex flex-col gap-(--sp-8) pt-(--sp-2) pb-(--sp-10)">
            <PositionBand position={data.position} />
            <WeekBand week={data.week} />
            <TodayBand today={data.today} />
            <NeedsAttentionBand na={data.needsAttention} />
            <DayCloseCard className="w-full" />
          </div>

          {/* Desktop order: Position · This week · Needs attention · Today's activity · Day Close + trend. */}
          <div className="hidden md:flex flex-col gap-(--sp-9) pt-(--sp-2) pb-(--sp-10)">
            <PositionBand position={data.position} />
            <WeekBand week={data.week} />
            <NeedsAttentionBand na={data.needsAttention} />
            <TodayBand today={data.today} />
            <CloseTrendBand trend={data.trend} />
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
