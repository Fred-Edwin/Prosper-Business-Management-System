"use client";

// Customers KPI strip — client feedback 2026-09-17: "a KPI strip on the
// Customers & Credit page".
//
// Adapted from `app/admin/sales/kpi-strip.tsx` (itself adapted from the
// house pattern, `app/admin/financials/kpi-strip.tsx` — design-
// principles.md §"Stat Tiles & KPI", 6R4-0). Purely informational, no
// scope selector — Customers has no Restaurant/Canteen-style split to
// pick between.
//
// Figures are computed client-side from the `customers: CustomerListRow[]`
// array the register already holds in memory (no new endpoint) — same
// justification as the Sales strip: a single business's customer register
// is a small array, cheap to reduce on every render.

import * as React from "react";
import type { CustomerListRow } from "@/lib/domain/customers";
import { fmtMoney } from "./repayment-form";

function money(dec: string): string {
  return `KES ${fmtMoney(dec)}`;
}

type Tile = { label: string; figure: string; caption: string };

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function tiles(customers: CustomerListRow[]): Tile[] {
  const owing = customers.filter((c) => Number(c.balance) > 0);
  const inCredit = customers.filter((c) => Number(c.balance) < 0);

  const totalOutstanding = owing.reduce((sum, c) => sum + Number(c.balance), 0);
  const totalCreditInHand = inCredit.reduce(
    (sum, c) => sum - Number(c.balance),
    0,
  );

  let oldest: { name: string; at: string } | null = null;
  for (const c of owing) {
    if (!c.oldestDebtAt) continue;
    if (!oldest || c.oldestDebtAt < oldest.at) {
      oldest = { name: c.name, at: c.oldestDebtAt };
    }
  }

  return [
    {
      label: "Total Outstanding",
      figure: money(totalOutstanding.toFixed(2)),
      caption: `${owing.length} owing`,
    },
    {
      label: "Customers Owing",
      figure: owing.length.toLocaleString("en-US"),
      caption: `of ${customers.length} total`,
    },
    {
      label: "Credit in Hand",
      figure: money(totalCreditInHand.toFixed(2)),
      caption: inCredit.length > 0 ? `${inCredit.length} overpaid` : " ",
    },
    {
      label: "Oldest Unpaid Debt",
      figure: oldest ? `${daysAgo(oldest.at)} days` : "—",
      caption: oldest ? oldest.name : " ",
    },
  ];
}

const LABEL =
  "font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] text-micro/micro [color:var(--text-tertiary)]";
const FIGURE =
  "font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/[20px]";
const CAPTION =
  "font-ui font-(--weight-regular) [color:var(--text-disabled)] text-micro/[14px]";

function TileCell({ tile, mobile }: { tile: Tile; mobile?: boolean }) {
  return (
    <div
      className={`flex flex-col grow basis-0 min-w-0 ${
        mobile ? "gap-[3px] py-[12px] px-[14px]" : "gap-[4px] py-[14px] px-[18px]"
      } border-r border-r-solid [border-right-color:var(--border-subtle)] last:border-r-0`}
    >
      <span className={LABEL}>{tile.label}</span>
      <span className={`${FIGURE} truncate`}>{tile.figure}</span>
      <span className={`${CAPTION} truncate`}>{tile.caption}</span>
    </div>
  );
}

export function CustomersKpiStrip({
  customers,
}: {
  customers: CustomerListRow[];
}) {
  const rows = React.useMemo(() => tiles(customers), [customers]);

  const row =
    "flex w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]";

  return (
    <section className="flex flex-col w-full gap-(--sp-3)">
      {/* Desktop — one row. */}
      <div className={`hidden md:flex ${row}`}>
        {rows.map((t) => (
          <TileCell key={t.label} tile={t} />
        ))}
      </div>

      {/* Mobile — wraps to a 2-col grid. */}
      <div
        className={`md:hidden grid grid-cols-2 w-full rounded-lg overflow-clip border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]`}
      >
        {rows.map((t, i) => (
          <div
            key={t.label}
            className={[
              i % 2 === 1
                ? "border-l border-l-solid [border-left-color:var(--border-subtle)]"
                : "",
              i < rows.length - (rows.length % 2 === 0 ? 2 : 1)
                ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <TileCell tile={t} mobile />
          </div>
        ))}
      </div>
    </section>
  );
}
