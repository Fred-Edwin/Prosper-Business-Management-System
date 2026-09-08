"use client";

// Staff-pay rework PR 3 — the per-staff "Payouts this month" list. Opened
// from a Pay-tab row that is PARTLY PAID (one or more live partial
// payouts, but the month's net is not fully settled). Lists this month's
// LIVE payouts, oldest first, with a per-row Reverse that opens
// <PayoutReversalDrawer> for that single payout (ADR-73) — mirrors how
// staff-adjustments-drawer.tsx lists rows with a per-row action.
//
// Composed from the frozen kit rail <Drawer> + <Button>.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { EmptyState } from "@/components/kit/empty-state";
import type { StaffPay, StaffPayoutView } from "@/lib/domain/staff";
import { money, shortDate } from "./format";
import { monthLabel } from "./month-picker";
import { PayoutReversalDrawer } from "./payout-reversal-drawer";

export function PayoutListDrawer({
  pay,
  month,
  onReverse,
  onPay,
  onClose,
}: {
  pay: StaffPay;
  /** `YYYY-MM`. */
  month: string;
  onReverse: (payoutId: string) => Promise<void>;
  /** Open the payout drawer to add another instalment. Omit when nothing is owed. */
  onPay?: (row: StaffPay) => void;
  onClose: () => void;
}) {
  const [reversing, setReversing] = React.useState<StaffPayoutView | null>(null);

  const rows = pay.payouts;
  const owes = Number(pay.netRemaining) > 0;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title="Payouts this month"
        subtitle={`${pay.staffName} · ${monthLabel(month)}`}
        variant="rail"
        footer={
          owes && onPay ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
              <Button
                variant="primary"
                className="grow"
                onClick={() => {
                  onPay(pay);
                  onClose();
                }}
              >
                Pay another instalment
              </Button>
            </>
          ) : (
            <Button variant="secondary" className="grow" onClick={onClose}>
              Done
            </Button>
          )
        }
      >
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          {owes
            ? `Paid ${money(pay.netPaid)} of ${money(pay.netPay)} this month · ${money(
                pay.netRemaining,
              )} still owed. Reversing one instalment frees that much of the net to be paid again.`
            : `Fully paid — ${money(pay.netPaid)} disbursed across ${
                rows.length
              } ${rows.length === 1 ? "payout" : "payouts"}. Reversing one frees that much of the net to be paid again.`}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No payouts this month"
            description="Partial payouts recorded for this staff member appear here."
          />
        ) : (
          <div className="flex flex-col rounded-sm overflow-clip border border-solid [border-color:var(--border-subtle)]">
            {rows.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-(--sp-4) py-(--sp-3) px-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
              >
                <div className="flex flex-col gap-(--sp-1) min-w-0">
                  <span className="font-ui [color:var(--text-primary)] text-sm/sm">
                    {shortDate(p.date)}
                  </span>
                  <span className="font-ui [color:var(--text-tertiary)] text-caption/micro truncate">
                    {p.paidFromAccount === "cash" ? "Cash" : "M-Pesa · Bank"}
                  </span>
                </div>
                <div className="flex items-center gap-(--sp-4) shrink-0">
                  <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                    KES {money(p.netPaid)}
                  </span>
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={() => setReversing(p)}
                  >
                    Reverse
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {reversing && (
        <PayoutReversalDrawer
          payout={reversing}
          staffName={pay.staffName}
          month={month}
          onReverse={onReverse}
          onClose={() => setReversing(null)}
        />
      )}
    </>
  );
}
