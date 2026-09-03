"use client";

// M3 S7 — the always-on Profit panel for /admin/financials (approved
// design, Paper "Prosper Hotel" · page "M3 S5 — Financials redesign").
// Promoted OUT of the tab row: Profit is a summary, not a transaction log,
// so it sits above the tabs and is always visible.
//
// Structure (desktop):
//   ┌ KPI row — kit-native, hairline dividers, mono figures, no box.
//   │   "Position & balances as of <date>"  ← as-of caption (ADR-57)
//   │   Total Business Liquidity · Cash at Hand · M-Pesa/Bank · Owed by owner
//   ├ Panel columns
//   │   Left  : "Profit for <range>" — Revenue − COGS = Gross − Expenses = Net
//   │   Right : Per location table · Debts owed to the business · Where
//   │           unsold stock went (non-sale consumption — a VIEW INTO COGS)
//
// Mobile stacks the same blocks; the KPI row becomes a compact 2-tile
// dark band (Cash at hand · M-Pesa/Bank) rendered by <KpiBandMobile> in
// financials-client.tsx.
//
// ADR-57 — FLOW figures (revenue, COGS, gross/net, expenses, non-sale)
// take the whole range; the four position figures are point-in-time "as
// of the end of the range". The caption + the tile sub-labels say so, so
// a range figure and a balance are never read as the same kind of number.
//
// ADR-55 — non-sale consumption is a view INTO COGS, never a sibling line
// item in the Revenue → Net running total. It renders as its own block,
// well clear of the stack, captioned "already inside the COGS figure".

import * as React from "react";
import { ErrorState } from "@/components/kit/error-state";
import type {
  FinancialSummary,
  LocationFinancials,
} from "@/lib/domain/financials";

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

/** `KES 1,234.00`, negative → red + leading `−`. */
function Figure({
  dec,
  size = "body",
  tone = "auto",
}: {
  dec: string;
  size?: "sm" | "body" | "h1" | "display";
  tone?: "auto" | "success" | "info" | "danger" | "primary";
}) {
  const n = Number(dec);
  const negative = Number.isFinite(n) && n < 0;
  const sizeCls =
    size === "display"
      ? "text-display/display font-(--weight-semibold)"
      : size === "h1"
        ? "text-h1/h1 font-(--weight-semibold)"
        : size === "sm"
          ? "text-sm/sm"
          : "text-body/body";
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "info"
        ? "text-info"
        : tone === "danger"
          ? "text-danger"
          : tone === "primary"
            ? "[color:var(--text-primary)]"
            : negative
              ? "text-danger"
              : "[color:var(--text-primary)]";
  return (
    <span className={`font-mono ${sizeCls} ${toneCls}`}>KES {money(dec)}</span>
  );
}

// ── KPI row (desktop) ─────────────────────────────────────────────────

type KpiTile = {
  label: string;
  dec: string;
  tone: "primary" | "success" | "info" | "danger";
};

function kpiTiles(c: FinancialSummary["consolidated"]): KpiTile[] {
  const liquidity = (Number(c.cashBalance) + Number(c.mpesaBankBalance)).toFixed(
    2,
  );
  return [
    { label: "Total Business Liquidity", dec: liquidity, tone: "primary" },
    { label: "Cash at Hand", dec: c.cashBalance, tone: "success" },
    { label: "M-Pesa / Bank Till", dec: c.mpesaBankBalance, tone: "info" },
    { label: "Owed Back by the Owner", dec: c.ownerOwedToBusiness, tone: "danger" },
  ];
}

/**
 * Desktop KPI row — kit-native: no card, a caption header, then four
 * figure columns separated by hairline vertical rules, all mono. Every
 * figure here is a BALANCE, read as of the end of the range (ADR-57) —
 * the caption spells that out.
 */
export function KpiRowDesktop({
  summary,
  asOfLabel,
  loading,
}: {
  summary: FinancialSummary | null;
  /** e.g. "7 Sep 2026" — the range's end date. */
  asOfLabel: string;
  loading: boolean;
}) {
  const tiles = summary ? kpiTiles(summary.consolidated) : null;
  return (
    <div className="flex flex-col gap-(--sp-3)">
      <div className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
        Position &amp; balances as of {asOfLabel}
      </div>
      <div className="flex">
        {(tiles ?? [null, null, null, null]).map((tile, i) => (
          <React.Fragment key={tile?.label ?? i}>
            {i > 0 && (
              <div className="w-px self-stretch shrink-0 [background-color:var(--border-strong)]" />
            )}
            <div
              className={`flex flex-col gap-(--sp-3) ${
                i === 0
                  ? "pr-(--sp-9)"
                  : i === 3
                    ? "pl-(--sp-9)"
                    : "px-(--sp-9)"
              }`}
            >
              <div className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
                {tile?.label ??
                  ["Total Business Liquidity", "Cash at Hand", "M-Pesa / Bank Till", "Owed Back by the Owner"][i]}
              </div>
              {tile ? (
                <Figure dec={tile.dec} size="display" tone={tile.tone} />
              ) : (
                <div
                  className={`font-mono font-(--weight-semibold) text-display/display [color:var(--text-tertiary)] ${
                    loading ? "kit-skeleton rounded-sm w-[120px] h-[1em]" : ""
                  }`}
                >
                  {loading ? "" : "—"}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── The Revenue → Net stack ──────────────────────────────────────────

function StackRow({
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
    <div className="flex items-baseline justify-between py-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <div className="flex items-baseline gap-(--sp-4)">
        <span
          className={`w-[12px] shrink-0 font-mono [color:var(--text-tertiary)] text-body/sm ${
            op ? "" : "invisible"
          }`}
        >
          {op ?? "−"}
        </span>
        <div className="flex flex-col">
          <span className="font-ui [color:var(--text-primary)] text-body/body">
            {label}
          </span>
          {sub && (
            <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {sub}
            </span>
          )}
        </div>
      </div>
      <Figure dec={dec} size="body" />
    </div>
  );
}

function StackTotal({
  label,
  dec,
  size,
}: {
  label: string;
  dec: string;
  size: "h1" | "display";
}) {
  return (
    <div className="flex items-baseline justify-between py-(--sp-5) gap-(--sp-4) border-t-2 border-t-solid [border-top-color:var(--border-strong)]">
      <span
        className={`font-ui font-(--weight-semibold) [color:var(--text-primary)] ${
          size === "display" ? "text-h2/h2" : "text-body/body"
        }`}
      >
        {label}
      </span>
      <Figure dec={dec} size={size} />
    </div>
  );
}

export function ProfitStack({
  c,
  rangeLabel,
  className,
}: {
  c: FinancialSummary["consolidated"];
  rangeLabel: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col shrink-0 gap-(--sp-5) ${className ?? ""}`}>
      <div className="flex items-baseline gap-(--sp-4)">
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
          Profit for {rangeLabel}
        </h2>
        <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          Consolidated
        </span>
      </div>
      <div className="flex flex-col md:w-[460px] py-(--sp-2) px-(--sp-6) rounded-md bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]">
        <StackRow
          label="Revenue"
          dec={c.revenue}
          sub="Restaurant orders + canteen sales, at selling price"
        />
        <StackRow
          label="Cost of goods sold"
          dec={c.cogs}
          op="−"
          sub="Opening stock + purchases − closing stock, by kind"
        />
        <StackTotal label="Gross profit" dec={c.grossProfit} size="h1" />
        <StackRow
          label="Total expenses"
          dec={c.totalExpenses}
          op="−"
          sub="Expenses logged over this range"
        />
        <StackTotal label="Net profit" dec={c.netProfit} size="display" />
      </div>
    </div>
  );
}

// ── Per location + debts + non-sale ──────────────────────────────────

const REASON_LABEL: Array<{
  key: keyof FinancialSummary["nonSaleConsumption"]["byReason"];
  label: string;
}> = [
  { key: "staffMeal", label: "Staff meals" },
  { key: "complimentary", label: "Complimentary" },
  { key: "spoiled", label: "Spoiled" },
  { key: "damaged", label: "Damaged" },
  { key: "other", label: "Other" },
];

function PerLocationTable({ rows }: { rows: LocationFinancials[] }) {
  return (
    <div className="flex flex-col rounded-sm overflow-clip bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]">
      <div className="flex items-center py-(--sp-3) px-(--sp-5) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="grow font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Location
        </div>
        {["Revenue", "COGS", "Gross profit"].map((h, i) => (
          <div
            key={h}
            className={`${i === 2 ? "w-[140px]" : "w-[130px]"} shrink-0 text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro`}
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((l, i) => (
        <div
          key={l.locationId}
          className={`flex items-center py-(--sp-4) px-(--sp-5) ${
            i < rows.length - 1
              ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              : ""
          }`}
        >
          <div className="grow font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            {l.locationName}
          </div>
          <div className="w-[130px] shrink-0 text-right font-mono [color:var(--text-primary)] text-sm/sm">
            {Number(l.revenue) === 0 ? (
              <span className="[color:var(--text-tertiary)]">—</span>
            ) : (
              money(l.revenue)
            )}
          </div>
          <div className="w-[130px] shrink-0 text-right font-mono [color:var(--text-primary)] text-sm/sm">
            {money(l.cogs)}
          </div>
          <div
            className={`w-[140px] shrink-0 text-right font-mono text-sm/sm ${
              Number(l.grossProfit) < 0 ? "text-danger" : "[color:var(--text-primary)]"
            }`}
          >
            {Number(l.grossProfit) < 0 ? "− " : ""}
            {money(String(Math.abs(Number(l.grossProfit)).toFixed(2)))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfitSecondary({
  summary,
  className,
}: {
  summary: FinancialSummary;
  className?: string;
}) {
  const c = summary.consolidated;
  const nsc = summary.nonSaleConsumption;
  return (
    <div className={`flex flex-col grow min-w-[0px] gap-(--sp-7) ${className ?? ""}`}>
      {/* Per location */}
      <div className="flex flex-col gap-(--sp-4)">
        <div className="flex items-baseline gap-(--sp-4)">
          <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            Per location
          </h2>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Revenue, cost and gross by location — expenses &amp; net stay
            consolidated
          </span>
        </div>
        {summary.perLocation.length === 0 ? (
          <div className="font-ui [color:var(--text-tertiary)] text-sm/sm">
            No location activity for this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <PerLocationTable rows={summary.perLocation} />
          </div>
        )}
      </div>

      {/* Debts owed to the business — a BALANCE (as of range end). */}
      <div className="flex items-baseline justify-between p-(--sp-5) rounded-sm gap-(--sp-4) bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
            Debts owed to the business
          </span>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Unpaid customer credit across all customers — derived, not stored
          </span>
        </div>
        <Figure dec={c.debtsOwedToBusiness} size="h1" tone="primary" />
      </div>

      {/* Where unsold stock went — a VIEW INTO COGS, never an addition. */}
      <div className="flex flex-col p-(--sp-6) rounded-sm gap-(--sp-4) [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Where unsold stock went
          </h2>
          <p className="font-ui [color:var(--text-secondary)] text-caption/micro">
            Estimated cost of staff meals, complimentary items and waste over
            this range —{" "}
            <span className="font-(--weight-medium) [color:var(--text-primary)]">
              already inside the COGS figure above
            </span>
            , shown here only so you can see what it is made of.
          </p>
        </div>
        <div className="flex flex-col gap-(--sp-3)">
          {REASON_LABEL.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-(--sp-4)"
            >
              <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                {label}
              </span>
              <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                KES {money(nsc.byReason[key])}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between pt-(--sp-3) gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]">
            <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
              Total (of which, within COGS)
            </span>
            <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
              KES {money(nsc.total)}
            </span>
          </div>
          <p className="font-ui [color:var(--text-tertiary)] text-micro/micro">
            Dishes costed at {Number(nsc.dishWasteCostPercent) * 100}% of selling
            price; ingredients and goods at buying price.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── The panel itself ─────────────────────────────────────────────────

export function ProfitPanelDesktop({
  summary,
  loading,
  error,
  onRetry,
  rangeLabel,
  asOfLabel,
}: {
  summary: FinancialSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  rangeLabel: string;
  asOfLabel: string;
}) {
  return (
    <>
      {/* ── Section 1: position & balances (KPI strip) ──────────────────
          Its own band on the subtle ground, hairline-separated from the
          Profit section below — a distinct read (a level, right now) from
          the Profit figures (an accumulation over the range). */}
      <div className="hidden md:flex flex-col py-(--sp-7) px-(--sp-8) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <KpiRowDesktop summary={summary} asOfLabel={asOfLabel} loading={loading} />
      </div>

      {/* ── Section 2: Profit (Revenue → Net + per-location + non-sale) ──
          On the page ground, generous top padding, so it reads as its own
          section between the KPI strip and the transaction tables. */}
      <div className="hidden md:flex flex-col pt-(--sp-8) pb-(--sp-9) px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        {error ? (
          <ErrorState
            title="Couldn't load the profit summary"
            description={error}
            onRetry={onRetry}
          />
        ) : loading && !summary ? (
          <div className="flex flex-col gap-(--sp-4)">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="kit-skeleton h-[20px] w-full rounded-sm" />
            ))}
          </div>
        ) : summary ? (
          <div className="flex items-start gap-(--sp-9)">
            <ProfitStack c={summary.consolidated} rangeLabel={rangeLabel} />
            <ProfitSecondary summary={summary} />
          </div>
        ) : null}
      </div>
    </>
  );
}
