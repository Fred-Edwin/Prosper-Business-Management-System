"use client";

// The "Pay out salary" drawer for the Pay & advances tab.
//
// The drawer SHOWS THE RECONCILIATION explicitly: Gross → − Advances →
// − Deductions → Net, then (staff-pay rework PR 3 — a staff-month accrues
// many partial payouts) → Already paid this month (Σ prior partials) →
// Remaining (highlighted) → an Amount to pay now input, defaulting to the
// full remaining and capped at it. "Pay the whole balance" is just
// leaving the default in.
//
// The server bounds the Admin-entered amount to the remaining net. Server
// error FIELDS are surfaced INLINE:
//   - 400 VALIDATION_ERROR field "amount" → over the remaining net
//   - 400 VALIDATION_ERROR field "net" → remaining ≤ 0 (nothing to disburse)
//   - 403 FORBIDDEN → the payout date's day is closed
//
// Composed from the frozen kit: <Drawer> + <Select> + <FormField> +
// <Button> + <Toast>, following app/admin/financials/expense-drawer.tsx.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import type { StaffPay } from "@/lib/domain/staff";
import { money } from "./format";
import { monthLabel } from "./month-picker";
import { StaffRequestError } from "./use-staff";

const ACCOUNT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa_bank", label: "M-Pesa · Bank" },
];

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

function ReconRow({
  label,
  value,
  op,
}: {
  label: string;
  value: string;
  op?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-(--sp-3) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
        {op ? `${op} ` : ""}
        {label}
      </span>
      <span className="font-mono [color:var(--text-primary)] text-sm/sm">
        {value}
      </span>
    </div>
  );
}

export function PayoutDrawer({
  pay,
  month,
  today,
  onPayOne,
  onClose,
}: {
  pay: StaffPay;
  /** `YYYY-MM`. */
  month: string;
  /** Africa/Nairobi today — the default and cap for the payout date. */
  today: string;
  onPayOne: (body: {
    staffId: string;
    month: string;
    paidFromAccount: "cash" | "mpesa_bank";
    date: string;
    amount: string;
  }) => Promise<StaffPay>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [account, setAccount] = React.useState<"cash" | "mpesa_bank">("cash");
  const [date, setDate] = React.useState(today);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const remainingNum = Number(pay.netRemaining);
  const remainingPositive =
    Number.isFinite(remainingNum) && remainingNum > 0;
  const hasPriorPayouts = Number(pay.netPaid) > 0;

  // Amount to pay now — defaults to the full remaining, capped at it.
  const [amount, setAmount] = React.useState(
    remainingPositive ? remainingNum.toFixed(2) : "",
  );
  const amountNum = Number(amount);
  const amountValid =
    /^\d+(\.\d{1,2})?$/.test(amount.trim()) && amountNum > 0;
  const overRemaining = amountValid && amountNum > remainingNum + 1e-9;

  const canSubmit =
    remainingPositive &&
    amountValid &&
    !overRemaining &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onPayOne({
        staffId: pay.staffId,
        month,
        paidFromAccount: account,
        date,
        amount: amountNum.toFixed(2),
      });
      toast(`Paid ${pay.staffName}`, { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof StaffRequestError) {
        if (e.field === "amount") {
          setError(
            `That is more than the KES ${money(pay.netRemaining)} still owed for ${monthLabel(month)}. Enter that or less.`,
          );
        } else if (e.field === "net") {
          setError(
            "There is nothing left to disburse for this month — the net is fully paid, or advances and deductions exceed what was earned.",
          );
        } else if (e.code === "FORBIDDEN") {
          setError(
            "That payout date falls on a closed day. Pick an open date, or reopen the day first.",
          );
        } else {
          setError(e.message);
        }
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Pay out salary"
      subtitle={`${pay.staffName} · ${monthLabel(month)}`}
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting}
          >
            Confirm payout
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {/* The reconciliation — Gross → − Advances → − Deductions → Net,
          then − Already paid this month → Remaining. */}
      <div className="flex flex-col rounded-sm overflow-clip border border-solid [border-color:var(--border-subtle)]">
        <ReconRow
          label={
            pay.payModel === "daily_entry"
              ? "Gross pay · daily entries"
              : `Gross pay · ${pay.daysPresent} days × ${money(pay.dailyRate)}`
          }
          value={money(pay.grossPay)}
        />
        <ReconRow
          label="Advances already paid in cash"
          op="−"
          value={money(pay.advances)}
        />
        <ReconRow label="Deductions" op="−" value={money(pay.deductions)} />
        <ReconRow label="Net for the month" value={money(pay.netPay)} />
        <ReconRow
          label="Already paid this month"
          op="−"
          value={money(pay.netPaid)}
        />
        <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-4) gap-(--sp-4) [background-color:var(--surface-subtle)]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Remaining
          </span>
          <span
            className={`font-mono font-(--weight-semibold) text-h1/h1 ${
              remainingPositive ? "[color:var(--text-primary)]" : "text-danger"
            }`}
          >
            {remainingNum < 0 ? "− " : ""}
            KES {money(Math.abs(remainingNum).toFixed(2))}
          </span>
        </div>
      </div>

      {!remainingPositive && !error && (
        <div className="font-ui text-danger text-caption/micro">
          {hasPriorPayouts
            ? "This month's net is fully paid — there is nothing left to disburse."
            : "Net pay is zero or less for this month — there is nothing to pay out. Advances and deductions recorded so far exceed what was earned."}
        </div>
      )}

      {remainingPositive && (
        <FormField
          label="Amount to pay now"
          required
          hint={`Defaults to the full remaining (${money(pay.netRemaining)}). Enter less for a partial payout.`}
          error={overRemaining ? `More than the KES ${money(pay.netRemaining)} still owed.` : undefined}
        >
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <span className="font-ui [color:var(--text-tertiary)] text-body/sm pr-(--sp-3)">
                KES
              </span>
              <input
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
              />
            </div>
          )}
        </FormField>
      )}

      <Select
        label="Pay from"
        required
        className="w-full"
        value={account}
        onChange={(v) => setAccount(v as "cash" | "mpesa_bank")}
        options={ACCOUNT_OPTIONS}
      />
      <div className="font-ui [color:var(--text-tertiary)] text-caption/micro -mt-(--sp-3)">
        Reduces this account&apos;s balance in Financials.
      </div>

      <FormField
        label="Payout date"
        required
        hint="Defaults to today. Posts to the money ledger on this date."
      >
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
            />
          </div>
        )}
      </FormField>
    </Drawer>
  );
}
