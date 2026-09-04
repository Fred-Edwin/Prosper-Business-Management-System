"use client";

// M3 S7 — the mobile half of the always-on Profit panel (approved design,
// Paper "M3 S5 — Financials redesign", mobile artboard). Same blocks as
// desktop, stacked:
//   • Profit for <range> — the Revenue → Net stack (compact rows)
//   • Per location — one line per location + the "debts owed" balance
//   • Where unsold stock went — the non-sale consumption view into COGS
//
// M5 S14 — the compact 2-tile balances band (<KpiBandMobile>) was REMOVED.
// "Where the money is now" is on the `/admin` dashboard (Band 1) only.
//
// The mobile date/range control lives in financials-client.tsx's "Date
// Row" (ADR-56 mobile header stays uncrowded).

import * as React from "react";
import { ErrorState } from "@/components/kit/error-state";
import type { FinancialSummary } from "@/lib/domain/financials";

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}
function signed(dec: string): string {
  const n = Number(dec);
  return `${n < 0 ? "− " : ""}KES ${money(Math.abs(n).toFixed(2))}`;
}

function MRow({
  label,
  dec,
  strong,
  total,
  danger,
}: {
  label: string;
  dec: string;
  strong?: boolean;
  total?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-(--sp-4) gap-(--sp-4) ${
        total
          ? "border-t-2 border-t-solid [border-top-color:var(--border-strong)]"
          : "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
      }`}
    >
      <span
        className={`font-ui ${
          strong
            ? "font-(--weight-semibold) [color:var(--text-primary)] text-body/body"
            : "[color:var(--text-secondary)] text-sm/sm"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono ${
          danger ? "text-danger" : "[color:var(--text-primary)]"
        } ${strong ? "font-(--weight-semibold) text-h1/h1" : "text-sm/sm"}`}
      >
        {danger ? signed(dec) : `KES ${money(dec)}`}
      </span>
    </div>
  );
}

export function ProfitPanelMobile({
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
  if (error) {
    return (
      <div className="md:hidden p-(--sp-5)">
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
      <div className="md:hidden flex flex-col gap-(--sp-4) p-(--sp-5)">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kit-skeleton h-[18px] w-full rounded-sm" />
        ))}
      </div>
    );
  }
  if (!summary) return null;
  const c = summary.consolidated;
  const nsc = summary.nonSaleConsumption;

  return (
    <div className="md:hidden flex flex-col">
      {/* Profit stack */}
      <div className="flex flex-col py-(--sp-6) px-(--sp-5) gap-(--sp-5) border-b-8 border-b-solid [border-bottom-color:var(--surface-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            Profit for {rangeLabel}
          </h2>
          <span className="font-ui [color:var(--text-tertiary)] text-micro/micro">
            Consolidated · liquidity KES{" "}
            {money(
              (Number(c.cashBalance) + Number(c.mpesaBankBalance)).toFixed(2),
            )}{" "}
            · owed by owner {signed(c.ownerOwedToBusiness)} · as of {asOfLabel}
          </span>
        </div>
        <div className="flex flex-col">
          <MRow label="Revenue" dec={c.revenue} />
          <MRow label="− Cost of goods sold" dec={c.cogs} />
          <MRow label="Gross profit" dec={c.grossProfit} strong total />
          <MRow label="− Total expenses" dec={c.totalExpenses} />
          <MRow label="Net profit" dec={c.netProfit} strong total danger />
        </div>
      </div>

      {/* Per location */}
      <div className="flex flex-col py-(--sp-6) px-(--sp-5) gap-(--sp-4) border-b-8 border-b-solid [border-bottom-color:var(--surface-subtle)]">
        <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
          Per location
        </h2>
        <div className="flex flex-col gap-(--sp-4)">
          {summary.perLocation.length === 0 ? (
            <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">
              No location activity for this range.
            </span>
          ) : (
            summary.perLocation.map((l, i) => (
              <div
                key={l.locationId}
                className={`flex flex-col gap-(--sp-2) ${
                  i < summary.perLocation.length - 1
                    ? "pb-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                    : ""
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro">
                    {l.locationName}
                  </span>
                  <span
                    className={`font-mono text-sm/micro ${
                      Number(l.grossProfit) < 0
                        ? "text-danger"
                        : "[color:var(--text-primary)]"
                    }`}
                  >
                    Gross {signed(l.grossProfit)}
                  </span>
                </div>
                <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                  Revenue {Number(l.revenue) === 0 ? "—" : money(l.revenue)} ·
                  COGS {money(l.cogs)}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between items-baseline pt-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <span className="font-ui uppercase [letter-spacing:var(--tracking-caps)] font-(--weight-medium) [color:var(--text-tertiary)] text-caption/micro">
            Debts owed to the business
          </span>
          <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-body/sm">
            KES {money(c.debtsOwedToBusiness)}
          </span>
        </div>
      </div>

      {/* Where unsold stock went */}
      <div className="flex flex-col py-(--sp-6) px-(--sp-5) gap-(--sp-4) [background-color:var(--surface-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Where unsold stock went
          </h2>
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            Staff meals, complimentary and waste over this range — already
            inside the COGS figure above.
          </span>
        </div>
        <div className="flex flex-col gap-(--sp-3)">
          <div className="flex justify-between">
            <span className="font-ui [color:var(--text-secondary)] text-sm/micro">
              Staff meals
            </span>
            <span className="font-mono [color:var(--text-primary)] text-sm/micro">
              KES {money(nsc.byReason.staffMeal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-ui [color:var(--text-secondary)] text-sm/micro">
              Spoiled
            </span>
            <span className="font-mono [color:var(--text-primary)] text-sm/micro">
              KES {money(nsc.byReason.spoiled)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-ui [color:var(--text-secondary)] text-sm/micro">
              Complimentary · Damaged · Other
            </span>
            <span className="font-mono [color:var(--text-primary)] text-sm/micro">
              KES{" "}
              {money(
                (
                  Number(nsc.byReason.complimentary) +
                  Number(nsc.byReason.damaged) +
                  Number(nsc.byReason.other)
                ).toFixed(2),
              )}
            </span>
          </div>
          <div className="flex justify-between pt-(--sp-3) border-t border-t-solid [border-top-color:var(--border-subtle)]">
            <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro">
              Total (within COGS)
            </span>
            <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro">
              KES {money(nsc.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
