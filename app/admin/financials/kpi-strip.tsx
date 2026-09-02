"use client";

// M3 S4 — the KPI stat strip, now WIRED to GET /api/financials/summary.
// S3 left it as "—" / "M3" placeholders with a deferred-implementation
// marker; the money-summary ledger exists now, so that marker is resolved
// and gone. The desktop strip and the mobile 2×2 grid markup + their
// semantic colours are unchanged — only the values are real.
//
// The four tiles, all from `summary.consolidated`:
//   • Total Business Liquidity = cashBalance + mpesaBankBalance  (running)
//   • Cash                     = cashBalance                     (running)
//   • M-Pesa / Bank Till       = mpesaBankBalance                (running)
//   • Today's Total Outflows   = totalExpenses for the picked day
//
// Balances are running totals (range-independent); "outflows" is the
// picked business date's logged expenses. Purchases and owner draws have
// their own tabs — this tile is the expense-outflow at a glance.

import * as React from "react";
import type { FinancialSummary } from "@/lib/domain/financials";

/** "1,234,567.00" from a "1234567.00" decimal string. */
function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

function addDec(a: string, b: string): string {
  return (Number(a) + Number(b)).toFixed(2);
}

type Tiles = { liquidity: string; cash: string; mpesa: string; outflows: string };

function tilesFrom(summary: FinancialSummary | null): Tiles | null {
  if (!summary) return null;
  const c = summary.consolidated;
  return {
    liquidity: addDec(c.cashBalance, c.mpesaBankBalance),
    cash: c.cashBalance,
    mpesa: c.mpesaBankBalance,
    outflows: c.totalExpenses,
  };
}

const DESKTOP_ORDER: Array<{ label: string; key: keyof Tiles }> = [
  { label: "Total Business Liquidity", key: "liquidity" },
  { label: "Cash", key: "cash" },
  { label: "M-Pesa / Bank Till", key: "mpesa" },
  { label: "Today's Total Outflows", key: "outflows" },
];

/** Desktop KPI stat strip — wired to the summary endpoint (S4). */
export function KpiStripDesktop({
  summary,
  loading,
}: {
  summary: FinancialSummary | null;
  loading: boolean;
}) {
  const tiles = tilesFrom(summary);
  return (
    <div className="flex [width:100%] items-center shrink-0 border border-solid [border-color:var(--border-subtle)]">
      {DESKTOP_ORDER.map(({ label, key }, i) => (
        <React.Fragment key={label}>
          {i > 0 && (
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
          )}
          <div
            className={`flex flex-col gap-(--sp-3) self-stretch justify-center py-(--sp-6) ${
              i === 0
                ? "pr-(--sp-8)"
                : i === DESKTOP_ORDER.length - 1
                  ? "pl-(--sp-8)"
                  : "px-(--sp-8)"
            }`}
          >
            <div className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
              {label}
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              {tiles ? (
                <>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                    KES
                  </div>
                  <div
                    className={`font-mono font-(--weight-semibold) text-display/display ${
                      key === "outflows"
                        ? "text-danger"
                        : "[color:var(--text-primary)]"
                    }`}
                  >
                    {money(tiles[key])}
                  </div>
                </>
              ) : (
                <div
                  className={`font-mono font-(--weight-semibold) text-display/display [color:var(--text-tertiary)] ${
                    loading ? "kit-skeleton rounded-sm w-[110px] h-[1em]" : ""
                  }`}
                >
                  {loading ? "" : "—"}
                </div>
              )}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const MOBILE_ORDER: Array<{ label: string; key: keyof Tiles; tone: string }> = [
  { label: "Total liquidity", key: "liquidity", tone: "text-white" },
  { label: "Cash at hand", key: "cash", tone: "text-success" },
  { label: "M-Pesa / Bank", key: "mpesa", tone: "text-info" },
  { label: "Today's outflows", key: "outflows", tone: "text-danger" },
];

/** Mobile dark 2×2 KPI grid — wired to the summary endpoint (S4). */
export function KpiGridMobile({
  summary,
  loading,
}: {
  summary: FinancialSummary | null;
  loading: boolean;
}) {
  const tiles = tilesFrom(summary);
  return (
    <div className="flex flex-wrap [background-color:var(--nav-bg)] shrink-0">
      {MOBILE_ORDER.map((tile, i) => (
        <div
          key={tile.label}
          className={`flex flex-col grow basis-[45%] p-(--sp-5) gap-(--sp-2) ${
            i % 2 === 0 ? "border-r border-r-solid border-r-(--nav-border)" : ""
          } ${i < 2 ? "border-b border-b-solid border-b-(--nav-border)" : ""}`}
        >
          <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] text-(--nav-text-label) text-micro/micro">
            {tile.label}
          </div>
          <div className="flex items-baseline gap-(--sp-3)">
            {tiles ? (
              <div
                className={`font-mono font-(--weight-semibold) ${tile.tone} text-body/body`}
              >
                {money(tiles[tile.key])}
              </div>
            ) : (
              <div
                className={`font-mono font-(--weight-semibold) text-(--nav-text-label) text-body/body ${
                  loading ? "kit-skeleton rounded-sm w-[70px] h-[1em]" : ""
                }`}
              >
                {loading ? "" : "—"}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
