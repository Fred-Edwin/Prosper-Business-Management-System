"use client";

// M3 S4 — the profit picture for the toolbar business date (PRD §4.7 /
// SCHEMA §14 / ADR-55). Rendered as an inner tab of /admin/financials.
// Composed from the kit <SimpleTable> + <ErrorState> + plain token markup
// (no new kit component — brief constraint).
//
//   Revenue − COGS = Gross Profit
//   Gross Profit − Total Expenses = Net Profit
//
// COGS is the stock-value sweep (opening + purchase receipts − closing),
// valued by kind (ingredient/goods → buyingPrice, dish → 0). It already
// contains the cost of everything that left stock — including waste. The
// non-sale consumption figure below is therefore a VIEW INTO COGS for
// management visibility, NOT a line item added on top of it: it is
// rendered as its own block, well clear of the Revenue → Net stack, and
// captioned so no reader totals the two.
//
// Per-location table carries revenue / COGS / gross. Expenses, Net Profit,
// debts and the account balances are consolidated only (Expense rows carry
// no location; ADR-55).

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
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

/** Signed money — a negative figure reads red, positive default. */
function Amount({ dec, strong = false }: { dec: string; strong?: boolean }) {
  const n = Number(dec);
  const negative = Number.isFinite(n) && n < 0;
  return (
    <span
      className={`font-mono ${strong ? "font-(--weight-semibold) text-h1/h1" : "text-body/sm"} ${
        negative ? "text-danger" : "[color:var(--text-primary)]"
      }`}
    >
      KES {money(dec)}
    </span>
  );
}

function Row({
  label,
  dec,
  sub,
  op,
}: {
  label: string;
  dec: string;
  sub?: string;
  /** The arithmetic operator shown to the left (− for a deduction). */
  op?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-(--sp-4) py-(--sp-3)">
      <div className="flex items-baseline gap-(--sp-3)">
        {op && (
          <span className="font-mono [color:var(--text-tertiary)] text-body/sm w-[12px]">
            {op}
          </span>
        )}
        <div className="flex flex-col">
          <span className="font-ui [color:var(--text-secondary)] text-body/sm">
            {label}
          </span>
          {sub && (
            <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {sub}
            </span>
          )}
        </div>
      </div>
      <Amount dec={dec} />
    </div>
  );
}

const REASON_LABEL: Array<{ key: keyof FinancialSummary["nonSaleConsumption"]["byReason"]; label: string }> = [
  { key: "staffMeal", label: "Staff meals" },
  { key: "complimentary", label: "Complimentary" },
  { key: "spoiled", label: "Spoiled" },
  { key: "damaged", label: "Damaged" },
  { key: "other", label: "Other" },
];

export function ProfitSummaryView({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: FinancialSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="pt-(--sp-6) px-(--sp-6) md:px-0">
        <ErrorState
          title="Couldn't load the profit summary"
          description={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="pt-(--sp-6) px-(--sp-6) md:px-0 flex flex-col gap-(--sp-4)">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kit-skeleton h-[20px] w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const c = summary.consolidated;
  const nsc = summary.nonSaleConsumption;

  const locationColumns: SimpleTableColumn<LocationFinancials>[] = [
    {
      key: "location",
      header: "Location",
      width: "grow basis-0 min-w-[120px]",
      render: (l) => (
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          {l.locationName}
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      width: "w-[130px] shrink-0",
      align: "right",
      cell: "mono",
      render: (l) => money(l.revenue),
    },
    {
      key: "cogs",
      header: "COGS",
      width: "w-[130px] shrink-0",
      align: "right",
      cell: "mono",
      render: (l) => money(l.cogs),
    },
    {
      key: "gross",
      header: "Gross profit",
      width: "w-[140px] shrink-0",
      align: "right",
      cell: "mono",
      render: (l) => <Amount dec={l.grossProfit} />,
    },
  ];

  return (
    <div className="flex flex-col grow min-h-0 gap-(--sp-8) pt-(--sp-6) pb-(--sp-8)">
      {/* ── The Revenue → Net Profit stack (consolidated) ──────────── */}
      <section className="flex flex-col px-(--sp-6) md:px-0">
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2 mb-(--sp-3)">
          Profit — consolidated
        </h2>
        <div className="flex flex-col divide-y divide-solid [border-color:var(--border-subtle)] max-w-[440px]">
          <Row label="Revenue" dec={c.revenue} sub="Restaurant orders + canteen sales, at selling price" />
          <Row
            label="Cost of goods sold"
            dec={c.cogs}
            op="−"
            sub="Opening stock + purchases − closing stock, by kind"
          />
          <div className="flex items-baseline justify-between gap-(--sp-4) py-(--sp-4) border-t-2 border-t-solid [border-top-color:var(--border-strong)]">
            <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
              Gross profit
            </span>
            <Amount dec={c.grossProfit} strong />
          </div>
          <Row label="Total expenses" dec={c.totalExpenses} op="−" sub="Expenses logged for this day" />
          <div className="flex items-baseline justify-between gap-(--sp-4) py-(--sp-4) border-t-2 border-t-solid [border-top-color:var(--border-strong)]">
            <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
              Net profit
            </span>
            <Amount dec={c.netProfit} strong />
          </div>
        </div>
      </section>

      {/* ── Position figures ──────────────────────────────────────── */}
      <section className="flex flex-wrap gap-(--sp-4) px-(--sp-6) md:px-0">
        {[
          { label: "Cash at hand", dec: c.cashBalance },
          { label: "M-Pesa / Bank", dec: c.mpesaBankBalance },
          { label: "Debts owed to the business", dec: c.debtsOwedToBusiness },
          { label: "Owed back by the owner", dec: c.ownerOwedToBusiness },
        ].map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-(--sp-2) p-(--sp-5) rounded-sm border border-solid [border-color:var(--border-subtle)] min-w-[180px] grow max-w-[240px]"
          >
            <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
              {tile.label}
            </span>
            <Amount dec={tile.dec} />
          </div>
        ))}
      </section>

      {/* ── Per-location ──────────────────────────────────────────── */}
      <section className="flex flex-col px-(--sp-6) md:px-0">
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2 mb-(--sp-1)">
          Per location
        </h2>
        <p className="font-ui [color:var(--text-tertiary)] text-caption/micro mb-(--sp-3)">
          Expenses and net profit are not split by location and are shown
          consolidated only.
        </p>
        {summary.perLocation.length === 0 ? (
          <div className="font-ui [color:var(--text-tertiary)] text-sm/sm">
            No location activity for this day.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <SimpleTable
              columns={locationColumns}
              rows={summary.perLocation}
              rowKey={(l) => l.locationId}
            />
          </div>
        )}
      </section>

      {/* ── Non-sale consumption — a VIEW INTO COGS, not an addition ─ */}
      <section className="flex flex-col p-(--sp-5) mx-(--sp-6) md:mx-0 rounded-sm border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-subtle)]">
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
          Where unsold stock went
        </h2>
        <p className="font-ui [color:var(--text-secondary)] text-caption/micro mt-(--sp-1) mb-(--sp-4)">
          Estimated cost of staff meals, complimentary items and waste for
          this day —{" "}
          <span className="font-(--weight-medium) [color:var(--text-primary)]">
            already inside the COGS figure above
          </span>
          , shown here only so you can see what it is made of. Dishes are
          costed at {Number(nsc.dishWasteCostPercent) * 100}% of their
          selling price; ingredients and goods at their buying price.
        </p>
        <div className="flex flex-col gap-(--sp-2)">
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
          <div className="flex items-baseline justify-between gap-(--sp-4) pt-(--sp-3) mt-(--sp-1) border-t border-t-solid [border-top-color:var(--border-subtle)]">
            <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
              Total (of which, within COGS)
            </span>
            <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
              KES {money(nsc.total)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
