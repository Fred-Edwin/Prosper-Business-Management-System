"use client";

// Correct or void one staff pay advance / deduction (ADR-15 / ADR-72).
// Composed from the frozen kit rail <Drawer> + <FormField> + <Button> +
// <Toast>, following purchase-payment-correction-drawer.tsx (the
// confirm-step Void pattern). The form submits the CORRECTED FINAL
// magnitude; the server (correctPayAdjustment) computes the signed delta
// and writes the append-only correction row.
//
// UNLIKE the purchase-payment / owner-draw / repayment corrections, a
// pay adjustment is NOT a cash-ledger event — there is NO paired
// MoneyMovement. It only nets into the derived pay figure at read time.
// The drawer copy says so.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { useToast } from "@/components/kit/toast";
import type { PayAdjustmentView } from "@/lib/domain/staff";
import { money, shortDateWithYear } from "./format";
import { StaffRequestError } from "./use-staff";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the amount and try again.",
  FORBIDDEN: "Only an administrator can correct a pay adjustment.",
  NOT_FOUND: "That adjustment no longer exists — reload the page.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function PayAdjustmentCorrectionDrawer({
  adjustment,
  staffName,
  onCorrect,
  onVoid,
  onClose,
}: {
  adjustment: PayAdjustmentView;
  staffName: string;
  onCorrect: (
    adjustmentId: string,
    body: { amount: string; note?: string },
  ) => Promise<void>;
  onVoid: (adjustmentId: string) => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const typeLabel = adjustment.type === "advance" ? "Advance" : "Deduction";

  const [amount, setAmount] = React.useState(adjustment.amount);
  const [note, setNote] = React.useState(adjustment.note ?? "");
  const [confirmVoid, setConfirmVoid] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<"correct" | "void" | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const voided = Number(adjustment.amount) === 0;
  const canSubmit = validAmount(amount) && submitting === null && !voided;

  function toMessage(e: unknown): string {
    return e instanceof StaffRequestError
      ? (CODE_MESSAGE[e.code] ?? e.message)
      : "Something went wrong. Try again.";
  }

  async function submitCorrect() {
    if (!canSubmit) return;
    setSubmitting("correct");
    setError(null);
    try {
      await onCorrect(adjustment.id, {
        amount: amount.trim(),
        note: note.trim() || undefined,
      });
      toast("Adjustment corrected", { tone: "success" });
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  async function submitVoid() {
    setSubmitting("void");
    setError(null);
    try {
      await onVoid(adjustment.id);
      toast("Adjustment voided", { tone: "success" });
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Correct ${typeLabel}`}
      subtitle={`${staffName} · ${shortDateWithYear(adjustment.date)}`}
      variant="rail"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting !== null}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submitCorrect}
            disabled={!canSubmit}
            loading={submitting === "correct"}
          >
            Save Correction
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        A correction is a new linked entry — the original is never
        overwritten. Enter the corrected final amount; this month&apos;s
        pay figure updates to match. No cash moves now — a pay adjustment
        only nets the payout later.
      </div>

      {voided && (
        <div className="font-ui text-danger text-caption/micro">
          This adjustment has already been voided — nothing left to
          correct.
        </div>
      )}

      <div className="flex flex-col gap-(--sp-1) font-ui text-caption/micro [color:var(--text-tertiary)]">
        <span>
          As recorded: KES {money(adjustment.originalAmount)}
          {adjustment.corrected
            ? ` · now KES ${money(adjustment.amount)} after earlier corrections`
            : ""}
        </span>
      </div>

      <FormField
        label={`Corrected ${typeLabel.toLowerCase()} amount`}
        required
        hint="Subtracted from this month's net pay for this staff member."
      >
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <span className="font-mono shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              KES
            </span>
            <input
              id={id}
              aria-describedby={describedBy}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              disabled={voided}
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <FormField label="Note">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — what changed?"
              disabled={voided}
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      {/* ── Void ────────────────────────────────────────────────────── */}
      {!voided && (
        <div className="flex flex-col gap-(--sp-3) pt-(--sp-5) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            Void this {typeLabel.toLowerCase()}
          </div>
          <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Fully reverses it — this month&apos;s pay figure goes back to
            what it would be without this entry.
          </div>
          {confirmVoid ? (
            <div className="flex items-center gap-(--sp-4)">
              <Button
                variant="destructive"
                size="sm"
                onClick={submitVoid}
                loading={submitting === "void"}
                disabled={submitting !== null}
              >
                Confirm void
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setConfirmVoid(false)}
                disabled={submitting !== null}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmVoid(true)}
                disabled={submitting !== null}
              >
                Void {typeLabel.toLowerCase()}…
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
