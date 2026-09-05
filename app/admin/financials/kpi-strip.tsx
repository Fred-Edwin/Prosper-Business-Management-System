"use client";

// M5 v2 Session C — the KPI strip on /admin/financials. Paper "Prosper
// Hotel" · page "M5 — Dashboard & Audit", `Financials — desktop [v2]`
// (KPI Strip) + `Financials — mobile [v2]` (KPI Grid). Spec:
// docs/design/flows/financials-screen.md "Structure (v2 — current)" §2.
//
// Six hairline-split tiles, ONE PER TRANSACTION TAB, in tab order. The
// strip is not an independent summary — it doubles as a tab indicator:
// the active tab's tile takes a 2px --color-accent left-rule +
// --surface-subtle background with an accent label, and clicking any tile
// switches to that tab. So every tile is a real <button>, and the strip
// is exposed as a tablist-adjacent control rather than decoration.
//
// Exact values pulled from the artboard with get_computed_styles (never
// eyeballed — CONVENTIONS §6): desktop tile 14px/18px padding, 4px gap,
// label 11px/14px 600 0.03em uppercase, figure mono 16px/20px 600,
// caption 11px/14px 400 --text-disabled, 1px --border-subtle splits, 8px
// radius. Mobile tile: 12px/14px padding, 3px gap. Strip caption: 11px/
// 14px 600 0.06em uppercase --text-tertiary, 6px above the row.

import * as React from "react";
import { ErrorState } from "@/components/kit/error-state";
import type { FinancialsTabKey } from "./financials-client";
import type { FinancialsKpis } from "./use-financials-kpis";

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** One tile's rendered content — resolved from the KPI data per tab. */
type TileSpec = {
  key: FinancialsTabKey;
  label: string;
  /** The mono figure. Count-led (with a dot) when there's an open item. */
  figure: string;
  /** A status dot beside the figure — only when something needs attention. */
  dot?: "warning" | "danger";
  caption: string;
};

/**
 * The six tiles, in tab order. Figures follow the artboard's rule:
 * **count-led with a status dot** where there's an open item to act on
 * (Deliveries pending / Handovers shortfall), **amount-led** otherwise.
 */
export function tileSpecs(
  kpis: FinancialsKpis | null,
  summary: {
    totalExpenses: string;
    ownerDrawsForPeriod: string;
    nonSaleTotal: string;
  } | null,
  periodNoun: string,
): TileSpec[] {
  const k = kpis;
  const s = summary;
  return [
    {
      key: "purchases",
      label: "Stock Purchases",
      figure: k ? money(k.purchases.total) : "—",
      caption: k ? `${k.purchases.count} payments` : " ",
    },
    {
      key: "deliveries",
      label: "Deliveries",
      figure: k
        ? k.deliveries.pending > 0
          ? `${k.deliveries.pending} pending`
          : `${k.deliveries.received} received`
        : "—",
      dot: k && k.deliveries.pending > 0 ? "warning" : undefined,
      caption: k ? `of ${k.deliveries.received + k.deliveries.pending} ${periodNoun}` : " ",
    },
    {
      key: "handovers",
      label: "Handovers",
      figure: k
        ? k.handovers.shortfalls > 0
          ? `${k.handovers.shortfalls} shortfall${k.handovers.shortfalls === 1 ? "" : "s"}`
          : `${k.handovers.declared} declared`
        : "—",
      dot: k && k.handovers.shortfalls > 0 ? "danger" : undefined,
      caption: k ? `${k.handovers.declared} declared ${periodNoun}` : " ",
    },
    {
      key: "expenses",
      label: "Expenses",
      figure: s ? money(Number(s.totalExpenses)) : "—",
      caption: k ? `${k.expenses.count} expenses` : " ",
    },
    {
      key: "owner-draws",
      label: "Owner Draws",
      figure: s ? money(Number(s.ownerDrawsForPeriod)) : "—",
      caption: k ? `${k.ownerDraws.count} draws` : " ",
    },
    {
      key: "non-sale",
      label: "Non-Sale Consumption",
      figure: s ? money(Number(s.nonSaleTotal)) : "—",
      caption: k ? `${k.nonSale.count} write-offs` : " ",
    },
  ];
}

const LABEL =
  "font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] text-micro/micro";
const FIGURE =
  "font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[20px]";
const CAPTION =
  "font-ui font-(--weight-regular) [color:var(--text-disabled)] text-micro/[14px]";

function Dot({ tone }: { tone: "warning" | "danger" }) {
  return (
    <span
      aria-hidden
      className={`w-[6px] h-[6px] rounded-full shrink-0 ${
        tone === "warning"
          ? "[background-color:var(--color-warning)]"
          : "[background-color:var(--color-danger)]"
      }`}
    />
  );
}

/** One tile — a real button; the strip doubles as a tab control. */
function Tile({
  spec,
  active,
  onSelect,
  mobile,
}: {
  spec: TileSpec;
  active: boolean;
  onSelect: (key: FinancialsTabKey) => void;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(spec.key)}
      aria-pressed={active}
      className={`relative flex flex-col grow basis-0 min-w-0 text-left ${
        mobile
          ? "gap-[3px] py-[12px] px-[14px]"
          : "gap-[4px] py-[14px] px-[18px]"
      } border-r border-r-solid [border-right-color:var(--border-subtle)] last:border-r-0 kit-interactive kit-focus-ring ${
        active ? "[background-color:var(--surface-subtle)]" : ""
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] [background-color:var(--color-accent)]"
        />
      )}
      <span
        className={`${LABEL} ${
          active ? "[color:var(--color-accent)]" : "[color:var(--text-tertiary)]"
        }`}
      >
        {spec.label}
      </span>
      <span className="flex items-center gap-[6px] min-w-0">
        {spec.dot && <Dot tone={spec.dot} />}
        <span className={`${FIGURE} truncate`}>{spec.figure}</span>
      </span>
      <span className={`${CAPTION} truncate`}>{spec.caption}</span>
    </button>
  );
}

/**
 * The strip. Desktop: one row of six. Mobile: a 2×3 grid (the spec's
 * explicit call — six tiles read better as a grid at 390px than as a
 * horizontal scroller).
 */
export function KpiStrip({
  specs,
  activeTab,
  onSelect,
  caption,
  error,
  onRetry,
}: {
  specs: TileSpec[];
  activeTab: FinancialsTabKey;
  onSelect: (key: FinancialsTabKey) => void;
  /** e.g. "This month at a glance". */
  caption: string;
  /**
   * A failed strip read. Without this the tiles would all render "—" with
   * nothing to say the figures are missing rather than genuinely zero —
   * a correct-looking screen hiding a broken one.
   */
  error?: string | null;
  onRetry?: () => void;
}) {
  const row = "flex w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]";
  return (
    <section className="flex flex-col w-full gap-[6px]">
      <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.06em] [color:var(--text-tertiary)] text-micro/[14px]">
        {caption}
      </span>

      {error && (
        <ErrorState
          title="Couldn't load the period figures"
          description={error}
          onRetry={onRetry}
        />
      )}

      {/* Desktop — six across. Hidden while errored: six "—" tiles would
          read as real zeroes. Tab switching stays available via the tab
          row itself, so nothing becomes unreachable. */}
      <div className={`${error ? "hidden" : "hidden md:flex"} ${row}`}>
        {specs.map((s) => (
          <Tile
            key={s.key}
            spec={s}
            active={s.key === activeTab}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Mobile — 2 rows of 3. */}
      <div className={`${error ? "hidden" : "md:hidden flex"} flex-col w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]`}>
        {[specs.slice(0, 3), specs.slice(3, 6)].map((group, i) => (
          <div
            key={i}
            className={
              i === 1
                ? "flex border-t border-t-solid [border-top-color:var(--border-subtle)]"
                : "flex"
            }
          >
            {group.map((s) => (
              <Tile
                key={s.key}
                spec={s}
                active={s.key === activeTab}
                onSelect={onSelect}
                mobile
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
