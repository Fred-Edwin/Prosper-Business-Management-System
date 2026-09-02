"use client";

// M3 S3 refactor — the KPI stat strip, lifted verbatim out of
// financials-client.tsx so that file can become a thin tab shell.
//
// M1 Financials cut (milestone-1-plan §2 / ADR-36 D-FIN): the strip has NO
// F2 data source (the MoneyMovement ledger is F3). Per the owner: keep the
// markup, render all four values as "—" with an "M3" caption. Do NOT wire
// it, do NOT delete the slot. No client-side money math.
// TODO(mock): the KPI strip is intentionally unwired — full figures land
// with the F3 MoneyMovement ledger (Milestone 3). Re-scoped, not forgotten.

import * as React from "react";

const KPI_TILES = [
  "Total Business Liquidity",
  "Cash",
  "M-Pesa / Bank Till",
  "Today's Total Outflows",
];

// Mobile KPI grid (artboard IQO-0): a dark 2×2 grid. Same four figures, still
// unwired until the F3 MoneyMovement ledger (ADR-36 D-FIN) — rendered "—" / "M3"
// with the artboard's semantic colour per cell, just made to fit 390px.
const MOBILE_KPI_TILES: { label: string; tone: string }[] = [
  { label: "Total liquidity", tone: "text-white" },
  { label: "Cash at hand", tone: "text-success" },
  { label: "M-Pesa / Bank", tone: "text-info" },
  { label: "Today's outflows", tone: "text-danger" },
];

/** Desktop KPI stat strip — markup kept; values unwired until F3 (ADR-36 D-FIN). */
export function KpiStripDesktop() {
  return (
    <div className="flex [width:100%] items-center shrink-0 border border-solid [border-color:var(--border-subtle)]">
      {KPI_TILES.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && (
            <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
          )}
          <div
            className={`flex flex-col gap-(--sp-3) self-stretch justify-center py-(--sp-6) ${
              i === 0
                ? "pr-(--sp-8)"
                : i === KPI_TILES.length - 1
                  ? "pl-(--sp-8)"
                  : "px-(--sp-8)"
            }`}
          >
            <div className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
              {label}
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <div className="font-mono font-(--weight-semibold) text-display/display [color:var(--text-tertiary)]">
                —
              </div>
              <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                M3
              </div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Mobile dark 2×2 KPI grid — present but unwired (— / M3, ADR-36 D-FIN). */
export function KpiGridMobile() {
  return (
    <div className="flex flex-wrap [background-color:var(--nav-bg)] shrink-0">
      {MOBILE_KPI_TILES.map((tile, i) => (
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
            <div
              className={`font-mono font-(--weight-semibold) ${tile.tone} text-body/body`}
            >
              —
            </div>
            <div className="font-ui text-(--nav-text-label) text-micro/micro">
              M3
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
