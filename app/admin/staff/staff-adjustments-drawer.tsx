"use client";

// M4 / ADR-72 — the per-staff "Advances & deductions this month" list.
// Opened from a Pay-tab row whose Advances / Deductions cell is non-zero.
// Lists that staff member's ORIGINAL adjustment rows for the month (a
// correction row is folded into its target's amount, never shown
// standalone) and offers a per-row Correct action, which opens
// <PayAdjustmentCorrectionDrawer>.
//
// Composed from the frozen kit rail <Drawer> + <Button>.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { EmptyState } from "@/components/kit/empty-state";
import type { PayAdjustmentView, StaffPay } from "@/lib/domain/staff";
import { money, shortDate } from "./format";
import { monthLabel } from "./month-picker";
import { PayAdjustmentCorrectionDrawer } from "./pay-adjustment-correction-drawer";

export function StaffAdjustmentsDrawer({
  pay,
  month,
  onCorrect,
  onVoid,
  onClose,
}: {
  pay: StaffPay;
  /** `YYYY-MM`. */
  month: string;
  onCorrect: (
    adjustmentId: string,
    body: { amount: string; note?: string },
  ) => Promise<void>;
  onVoid: (adjustmentId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = React.useState<PayAdjustmentView | null>(null);

  const rows = pay.adjustments;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title="Advances & deductions"
        subtitle={`${pay.staffName} · ${monthLabel(month)}`}
        variant="rail"
        footer={
          <Button variant="secondary" className="grow" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          Both advances and deductions are netted off this month&apos;s
          pay. Correcting or voiding one adjusts the payout figure — no
          cash moves until the payout is recorded.
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No adjustments this month"
            description="Advances and deductions recorded for this staff member appear here."
          />
        ) : (
          <div className="flex flex-col rounded-sm overflow-clip border border-solid [border-color:var(--border-subtle)]">
            {rows.map((a) => {
              const voided = Number(a.amount) === 0;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-(--sp-4) py-(--sp-3) px-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
                >
                  <div className="flex flex-col gap-(--sp-1) min-w-0">
                    <span className="font-ui [color:var(--text-primary)] text-sm/sm">
                      {a.type === "advance" ? "Advance" : "Deduction"} ·{" "}
                      {shortDate(a.date)}
                    </span>
                    <span className="font-ui [color:var(--text-tertiary)] text-caption/micro truncate">
                      {voided
                        ? "Voided"
                        : a.corrected
                          ? `KES ${money(a.amount)} · corrected from KES ${money(
                              a.originalAmount,
                            )}`
                          : a.note || "No note"}
                    </span>
                  </div>
                  <div className="flex items-center gap-(--sp-4) shrink-0">
                    <span
                      className={`font-mono text-sm/sm ${
                        voided
                          ? "[color:var(--text-tertiary)] line-through"
                          : "[color:var(--text-primary)]"
                      }`}
                    >
                      KES {money(a.amount)}
                    </span>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => setEditing(a)}
                    >
                      {voided ? "View" : "Correct"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {editing && (
        <PayAdjustmentCorrectionDrawer
          adjustment={editing}
          staffName={pay.staffName}
          onCorrect={onCorrect}
          onVoid={onVoid}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
