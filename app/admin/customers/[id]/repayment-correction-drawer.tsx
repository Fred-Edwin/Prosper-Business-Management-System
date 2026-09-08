"use client";

// Correct or void a customer debt repayment (ADR-19 / ADR-72). Composed
// from the kit rail <Drawer> + <TextInput> + <SegmentedControl> +
// <Textarea> + <Button>, following purchase-payment-correction-drawer.tsx.
// The form submits the CORRECTED FINAL values; the server
// (correctRepayment) computes the delta and writes the append-only
// correction Repayment row + paired MoneyMovement. "Void" fully reverses
// the repayment (the customer owes it again).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/text-input";
import { Textarea } from "@/components/kit/textarea";
import { SegmentedControl } from "@/components/kit/segmented-control";
import type { CustomerLedgerEntry, MoneyAccount } from "@/lib/domain/customers";
import type { CorrectRepaymentArgs } from "../use-customers";
import { fmtMoney } from "../repayment-form";

const ACCOUNT_LABELS = ["Cash", "M-Pesa"] as const;
const ACCOUNT_BY_LABEL: Record<string, MoneyAccount> = {
  Cash: "cash",
  "M-Pesa": "mpesa_bank",
};
const LABEL_BY_ACCOUNT: Record<MoneyAccount, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa",
};

const amountValid = (v: string) =>
  /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0;

export function RepaymentCorrectionDrawer({
  customerId,
  entry,
  onCorrect,
  onVoid,
  onClose,
  onDone,
}: {
  customerId: string;
  /** A `kind: "repayment"` ledger entry — carries `repaymentId` + current derived amount. */
  entry: CustomerLedgerEntry;
  onCorrect: (args: CorrectRepaymentArgs) => Promise<void>;
  onVoid: (customerId: string, repaymentId: string) => Promise<void>;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const repaymentId = entry.repaymentId ?? "";

  const [amount, setAmount] = React.useState(String(Number(entry.amount)));
  const [accountLabel, setAccountLabel] = React.useState<string>(
    entry.account ? LABEL_BY_ACCOUNT[entry.account] : "Cash",
  );
  const [note, setNote] = React.useState(entry.note ?? "");
  const [confirmVoid, setConfirmVoid] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<"correct" | "void" | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = amountValid(amount) && submitting === null;

  function toMessage(e: unknown): string {
    return e instanceof Error ? e.message : "Something went wrong. Try again.";
  }

  async function submitCorrect() {
    if (!canSubmit) return;
    setSubmitting("correct");
    setError(null);
    try {
      await onCorrect({
        customerId,
        repaymentId,
        amount: amount.trim(),
        account: ACCOUNT_BY_LABEL[accountLabel],
        note: note.trim() !== "" ? note.trim() : undefined,
      });
      onDone("Repayment corrected");
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
      await onVoid(customerId, repaymentId);
      onDone("Repayment voided");
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        A correction is a new linked entry — the original is never
        overwritten. Enter the corrected final amount; the cash / M-Pesa
        balance and the customer&apos;s running balance update to match.
      </div>

      <div className="flex items-center justify-between border-b border-b-solid [border-bottom-color:var(--border-subtle)] pb-(--sp-5)">
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          Current repayment
        </span>
        <span className="font-mono [color:var(--text-primary)] text-sm/sm">
          KES {fmtMoney(entry.amount)}
        </span>
      </div>

      <div className="flex flex-col gap-(--sp-6) [&>*]:w-full [&_.kit-field]:w-full">
        <TextInput
          label="Corrected amount"
          startAdornment="KES"
          inputMode="decimal"
          required
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={amount.trim() !== "" && !amountValid(amount)}
          helperText={
            amount.trim() !== "" && !amountValid(amount)
              ? "Enter an amount greater than 0"
              : undefined
          }
        />

        <SegmentedControl
          label="Account in"
          options={[...ACCOUNT_LABELS]}
          value={accountLabel}
          onChange={setAccountLabel}
        />

        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-(--sp-4) pt-(--sp-4)">
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
      </div>

      {/* ── Void ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-(--sp-3) pt-(--sp-5) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          Void this repayment
        </div>
        <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          Fully reverses the repayment: pulls the money back out of the
          account it landed in, and the customer owes the amount again.
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
              Void repayment…
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
