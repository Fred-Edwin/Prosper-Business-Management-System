"use client";

// Reverse one recorded staff payout (ADR-73, per ADR-72's deferred list).
// Composed from the frozen kit rail <Drawer> + <Button> + <Toast>,
// following purchase-payment-correction-drawer.tsx / the confirm-step
// Void pattern in pay-adjustment-correction-drawer.tsx.
//
// A payout has no amount to restate — the only action is a full reverse,
// so this drawer is Void-only: an explanation, then a destructive
// "Reverse payout" behind a confirm step. The server zeroes the linked
// Salaries Expense (restoring Cash + Net Profit) and frees the
// staff-month to be paid again.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { useToast } from "@/components/kit/toast";
import type { StaffPayoutView } from "@/lib/domain/staff";
import { money, shortDateWithYear } from "./format";
import { monthLabel } from "./month-picker";
import { StaffRequestError } from "./use-staff";

const CODE_MESSAGE: Record<string, string> = {
  CONFLICT: "This payout has already been reversed — reload the page.",
  FORBIDDEN: "Only an administrator can reverse a payout.",
  NOT_FOUND: "That payout no longer exists — reload the page.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

export function PayoutReversalDrawer({
  payout,
  staffName,
  month,
  onReverse,
  onClose,
}: {
  /** The single partial payout being reversed. */
  payout: StaffPayoutView;
  staffName: string;
  /** `YYYY-MM`. */
  month: string;
  onReverse: (payoutId: string) => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [confirm, setConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await onReverse(payout.id);
      toast(`Reversed ${staffName}'s payout`, { tone: "success" });
      onClose();
    } catch (e) {
      setError(
        e instanceof StaffRequestError
          ? (CODE_MESSAGE[e.code] ?? e.message)
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Reverse payout"
      subtitle={`${staffName} · ${monthLabel(month)}`}
      variant="rail"
      footer={
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={submitting}
          className="grow"
        >
          Close
        </Button>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        Reversing undoes this one instalment: the Salaries expense it
        created is corrected to zero — a new linked entry, the original is
        never overwritten — so Cash and Net Profit go back to where they
        were. That much of the month&apos;s net becomes owed again and can
        be paid out afresh.
      </div>

      <div className="flex flex-col rounded-sm overflow-clip border border-solid [border-color:var(--border-subtle)]">
        <div className="flex items-baseline justify-between py-(--sp-3) px-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            Paid on
          </span>
          <span className="font-mono [color:var(--text-primary)] text-sm/sm">
            {shortDateWithYear(payout.date)}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-(--sp-3) px-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            From
          </span>
          <span className="font-ui [color:var(--text-primary)] text-sm/sm">
            {payout.paidFromAccount === "cash" ? "Cash" : "M-Pesa · Bank"}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-4) gap-(--sp-4) [background-color:var(--surface-subtle)]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Amount to reverse
          </span>
          <span className="font-mono font-(--weight-semibold) text-h1/h1 [color:var(--text-primary)]">
            KES {money(payout.netPaid)}
          </span>
        </div>
      </div>

      {/* ── Reverse ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-(--sp-3) pt-(--sp-5) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          Reverse this payout
        </div>
        {confirm ? (
          <div className="flex items-center gap-(--sp-4)">
            <Button
              variant="destructive"
              size="sm"
              onClick={submit}
              loading={submitting}
              disabled={submitting}
            >
              Confirm reversal
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setConfirm(false)}
              disabled={submitting}
            >
              Keep it
            </Button>
          </div>
        ) : (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirm(true)}
            >
              Reverse payout…
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
