"use client";

// M4 S9B — the "Pay out salary" drawer for the Pay & advances tab.
//
// The drawer SHOWS THE RECONCILIATION explicitly (design requirement 3):
// Gross → − Advances → − Deductions → a highlighted "Net to pay now" row.
// This is the one place the owner sees WHY the payout is smaller than
// gross. Then: Pay from (Cash / M-Pesa · Bank) + Payout date.
//
// The server recomputes the net — there is NO amount field on the request
// (API.md, ADR-60). Server error FIELDS are surfaced INLINE:
//   - 409 CONFLICT field "month"  → already paid this month
//   - 400 VALIDATION_ERROR field "net" → net ≤ 0 (advances+deductions > gross)
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
  }) => Promise<StaffPay>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [account, setAccount] = React.useState<"cash" | "mpesa_bank">("cash");
  const [date, setDate] = React.useState(today);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const netNum = Number(pay.netPay);
  const netPositive = Number.isFinite(netNum) && netNum > 0;

  const canSubmit =
    netPositive && !pay.paid && /^\d{4}-\d{2}-\d{2}$/.test(date) && !submitting;

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
      });
      toast(`Paid ${pay.staffName}`, { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof StaffRequestError) {
        if (e.field === "month") {
          setError(
            `${pay.staffName} has already been paid for ${monthLabel(month)}.`,
          );
        } else if (e.field === "net") {
          setError(
            "Net pay is zero or less — advances and deductions already recorded exceed what was earned. Nothing to disburse; record a correcting entry first.",
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

      {/* The reconciliation — Gross → − Advances → − Deductions → Net. */}
      <div className="flex flex-col rounded-sm overflow-clip border border-solid [border-color:var(--border-subtle)]">
        <ReconRow
          label={`Gross pay · ${pay.daysPresent} days × ${money(pay.dailyRate)}`}
          value={money(pay.grossPay)}
        />
        <ReconRow
          label="Advances already paid in cash"
          op="−"
          value={money(pay.advances)}
        />
        <ReconRow label="Deductions" op="−" value={money(pay.deductions)} />
        <div className="flex items-baseline justify-between py-(--sp-4) px-(--sp-4) gap-(--sp-4) [background-color:var(--surface-subtle)]">
          <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
            Net to pay now
          </span>
          <span
            className={`font-mono font-(--weight-semibold) text-h1/h1 ${
              netPositive ? "[color:var(--text-primary)]" : "text-danger"
            }`}
          >
            {netNum < 0 ? "− " : ""}
            KES {money(Math.abs(netNum).toFixed(2))}
          </span>
        </div>
      </div>

      {!netPositive && !error && (
        <div className="font-ui text-danger text-caption/micro">
          Net pay is zero or less for this month — there is nothing to pay
          out. Advances and deductions recorded so far exceed what was
          earned.
        </div>
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
