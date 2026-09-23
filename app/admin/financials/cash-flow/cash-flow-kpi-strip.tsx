"use client";

// The Cash Flow page's own 4-tile KPI strip — opening→closing and net
// change, per account. NOT a modification of the shared
// app/admin/financials/kpi-strip.tsx, which stays Financials-only and
// hard-coded to one tile per transaction tab (owner decision: Cash Flow's
// KPI needs are a different shape — 4 tiles, no tab-switching behaviour —
// so it gets its own small component rather than reworking the frozen
// one). Visual language (mono figures, uppercase labels, hairline
// dividers) matches kpi-strip.tsx's tiles without sharing its code.

import type { CashFlowReport } from "@/lib/domain/financials";

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

function netChange(opening: string, closing: string): number {
  return Number(closing) - Number(opening);
}

const LABEL =
  "font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] [color:var(--text-tertiary)] text-micro/micro";
const FIGURE =
  "font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[20px]";

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col grow basis-0 min-w-0 gap-[4px] py-[14px] px-[18px] border-r border-r-solid [border-right-color:var(--border-subtle)] last:border-r-0">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

/** Signed, colored net-change figure — reused across all "did it move" tiles. */
function NetChangeFigure({ value }: { value: number }) {
  const tone =
    value > 0
      ? "text-success"
      : value < 0
        ? "text-danger"
        : "[color:var(--text-primary)]";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span className={`${FIGURE} ${tone}`}>
      {sign}
      {money(Math.abs(value).toFixed(2))}
    </span>
  );
}

export function CashFlowKpiStrip({ report }: { report: CashFlowReport | null }) {
  const cashNet = report
    ? netChange(report.openingBalances.cash, report.closingBalances.cash)
    : null;
  const mpesaNet = report
    ? netChange(report.openingBalances.mpesaBank, report.closingBalances.mpesaBank)
    : null;

  return (
    <div className="flex flex-col w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]">
      <div className="flex flex-wrap w-full">
        <Tile label="Cash — opening → closing">
          <span className={FIGURE}>
            {report
              ? `${money(report.openingBalances.cash)} → ${money(report.closingBalances.cash)}`
              : "—"}
          </span>
        </Tile>
        <Tile label="Cash — net change">
          {cashNet != null ? (
            <NetChangeFigure value={cashNet} />
          ) : (
            <span className={FIGURE}>—</span>
          )}
        </Tile>
        <Tile label="M-Pesa / Bank — opening → closing">
          <span className={FIGURE}>
            {report
              ? `${money(report.openingBalances.mpesaBank)} → ${money(report.closingBalances.mpesaBank)}`
              : "—"}
          </span>
        </Tile>
        <Tile label="M-Pesa / Bank — net change">
          {mpesaNet != null ? (
            <NetChangeFigure value={mpesaNet} />
          ) : (
            <span className={FIGURE}>—</span>
          )}
        </Tile>
      </div>
    </div>
  );
}
