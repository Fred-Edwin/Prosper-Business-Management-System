"use client";

// ADR-76 / ADR-72 — the per-staff "Daily pay this month" list for a
// `daily_entry` staff member. Opened from a Pay-tab row's Gross pay cell.
// Lists that staff member's ORIGINAL daily pay entries for the month (a
// correction row is folded into its target's amount, never shown
// standalone) and offers a per-row Correct / Void action, which opens
// <DailyPayCorrectionDrawer>. Mirrors staff-adjustments-drawer.tsx.
//
// Composed from the frozen kit rail <Drawer> + <Button> + <EmptyState>.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { EmptyState } from "@/components/kit/empty-state";
import type { DailyPayView, StaffPay } from "@/lib/domain/staff";
import { money, shortDate } from "./format";
import { monthLabel } from "./month-picker";
import { DailyPayCorrectionDrawer } from "./daily-pay-correction-drawer";

export function DailyPayDrawer({
  pay,
  month,
  onLog,
  onCorrect,
  onVoid,
  onClose,
}: {
  pay: StaffPay;
  /** `YYYY-MM`. */
  month: string;
  /** Open the "Log daily pay" drawer for this staff member. */
  onLog: () => void;
  onCorrect: (
    dailyPayId: string,
    body: { amount: string; note?: string },
  ) => Promise<void>;
  onVoid: (dailyPayId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = React.useState<DailyPayView | null>(null);

  const rows = pay.dailyPay;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title="Daily pay"
        subtitle={`${pay.staffName} · ${monthLabel(month)}`}
        variant="rail"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
            <Button variant="primary" className="grow" onClick={onLog}>
              Log daily pay
            </Button>
          </>
        }
      >
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          Each entry is one day&apos;s pay for this staff member. This
          month&apos;s gross pay is the sum of the entries below.
          Correcting or voiding one adjusts the gross — no cash moves until
          the payout is recorded.
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No daily pay logged this month"
            description="Log a day's pay for this staff member and it appears here."
          />
        ) : (
          <div className="flex flex-col rounded-sm overflow-clip border border-solid [border-color:var(--border-subtle)]">
            {rows.map((d) => {
              const voided = Number(d.amount) === 0;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-(--sp-4) py-(--sp-3) px-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
                >
                  <div className="flex flex-col gap-(--sp-1) min-w-0">
                    <span className="font-ui [color:var(--text-primary)] text-sm/sm">
                      {shortDate(d.date)}
                    </span>
                    <span className="font-ui [color:var(--text-tertiary)] text-caption/micro truncate">
                      {voided
                        ? "Voided"
                        : d.corrected
                          ? `KES ${money(d.amount)} · corrected from KES ${money(
                              d.originalAmount,
                            )}`
                          : d.note || "No note"}
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
                      KES {money(d.amount)}
                    </span>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => setEditing(d)}
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
        <DailyPayCorrectionDrawer
          entry={editing}
          staffName={pay.staffName}
          onCorrect={onCorrect}
          onVoid={onVoid}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
