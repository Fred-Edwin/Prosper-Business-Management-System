"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/text-input";
import { Textarea } from "@/components/kit/textarea";
import { SegmentedControl } from "@/components/kit/segmented-control";
import type { MoneyAccount } from "@/lib/domain/customers";
import type { RecordRepaymentArgs } from "./use-customers";

/**
 * The repayment form body — shared by A1's rail `Drawer`, A2's rail
 * `Drawer`, and C6's `BottomSheet`. The overlay chrome (scrim, portal,
 * focus-trap, footer slot) is the kit component's; this is just the
 * fields + the derived-balance read-out header (flow doc §A/§C).
 *
 * `amount` is kept as a raw string and passed straight through — decimal
 * end to end, no `Number()` (plan §1 "money and quantities are decimal
 * strings end to end").
 */

const ACCOUNT_LABELS = ["Cash", "M-Pesa"] as const;
const ACCOUNT_BY_LABEL: Record<string, MoneyAccount> = {
  Cash: "cash",
  "M-Pesa": "mpesa_bank",
};

export function fmtMoney(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

/**
 * "Owes KES 1,200" / "Settled" — the balance read-out (never an input).
 * `whole` drops the decimals (C6's in-sheet header, artboard DDD-0 —
 * "Owes KES 1,200"). The A1/A2 rail-Drawer "Current balance" row keeps
 * 2dp (`whole = false`, the default).
 */
export function balanceLabel(balance: string, whole = false): string {
  const n = Number(balance);
  if (Number.isFinite(n) && n === 0) return "Settled";
  const fmt = (dec: string) =>
    whole && Number.isFinite(Number(dec))
      ? Number(dec).toLocaleString("en-US", { maximumFractionDigits: 0 })
      : fmtMoney(dec);
  if (Number.isFinite(n) && n < 0) return `KES ${fmt(String(-n))} in credit`;
  return `Owes KES ${fmt(balance)}`;
}

export interface RepaymentFormProps {
  customerId: string;
  balance: string;
  /**
   * When set, an in-body name + balance header is rendered (C6's
   * `BottomSheet` has no subtitle slot — artboard DDD-0). A1/A2 pass the
   * name via the rail `Drawer` subtitle instead and leave this unset.
   */
  customerName?: string;
  /** Show a Note textarea (A1/A2 — the flow doc adds it on the Admin drawer). */
  withNote?: boolean;
  onSubmit: (args: RecordRepaymentArgs) => Promise<void>;
  onDone: () => void;
  /** Footer render slot — the overlay owns where the footer sits. */
  renderFooter: (node: React.ReactNode) => React.ReactNode;
}

export function RepaymentForm({
  customerId,
  balance,
  customerName,
  withNote = false,
  onSubmit,
  onDone,
  renderFooter,
}: RepaymentFormProps) {
  const [amount, setAmount] = React.useState("");
  const [accountLabel, setAccountLabel] = React.useState<string>("Cash");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const amountValid = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0;

  async function submit() {
    if (!amountValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        customerId,
        amount: amount.trim(),
        account: ACCOUNT_BY_LABEL[accountLabel],
        note: withNote && note.trim() !== "" ? note.trim() : undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the repayment.");
    } finally {
      setSubmitting(false);
    }
  }

  const owes = Number(balance) > 0;

  return (
    <>
      {customerName ? (
        /* C6 BottomSheet in-body header (artboard DDD-0) — name then a
           whole-KES balance line, no h1 title above it. */
        <div className="flex flex-col gap-[2px] pb-(--sp-5)">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            {customerName}
          </span>
          <span
            className={`font-ui text-sm/sm ${
              owes ? "text-danger" : "[color:var(--text-tertiary)]"
            }`}
          >
            {balanceLabel(balance, true)}
          </span>
        </div>
      ) : (
        /* A1/A2 rail-Drawer: Current-balance read-out row (artboard EJ6-0). */
        <div className="flex items-center justify-between border-b border-b-solid [border-bottom-color:var(--border-subtle)] pb-(--sp-5)">
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            Current balance
          </span>
          <span
            className={`font-mono text-sm/sm ${
              owes ? "text-danger" : "[color:var(--text-tertiary)]"
            }`}
          >
            {balanceLabel(balance)}
          </span>
        </div>
      )}

      {/* The kit form controls wrap in a FormField hard-set to `w-[280px]`;
          in the C6 sheet / rail Drawer the fields should fill the width
          (artboards DDD-0 / EJ6-0). Force the FormField wrapper + the
          `.kit-field` box to full width here. */}
      <div className="flex flex-col gap-(--sp-6) [&>*]:w-full [&_.kit-field]:w-full">
        <TextInput
          label="Amount"
          startAdornment="KES"
          inputMode="decimal"
          required
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={amount.trim() !== "" && !amountValid}
          helperText={
            amount.trim() !== "" && !amountValid
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

        {withNote && (
          <Textarea
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </div>

      {error && (
        <div role="alert" className="font-ui text-danger text-sm/sm">
          {error}
        </div>
      )}

      {renderFooter(
        <Button
          variant="primary"
          onClick={submit}
          loading={submitting}
          disabled={!amountValid}
        >
          Record repayment
        </Button>,
      )}
    </>
  );
}
