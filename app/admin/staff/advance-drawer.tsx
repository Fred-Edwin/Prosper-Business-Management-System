"use client";

// M4 S9B — the "Record advance / deduction" drawer (the Pay tab header
// primary action). This is the MID-MONTH action (Moment 1 = advance, cash
// leaves the till that day; Moment 2 = deduction, no cash moves) — it is
// distinct from the payroll-day Pay out drawer.
//
// POST /api/pay — day-close gated (assertDayOpen on `date`). Both types
// net OFF this month's pay. Undo a mistake by recording the opposite type
// for the same amount (append-only — CONVENTIONS §4).
//
// Composed from the frozen kit: <Drawer> + <Select> + <SegmentedControl> +
// <FormField> + <Button> + <Toast>, following expense-drawer.tsx.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import { ROLE_LABEL } from "./format";
import { monthLabel } from "./month-picker";
import type { PayAdjustmentBody } from "./use-staff";
import { StaffRequestError, useRoster } from "./use-staff";

const ADVANCE = "Advance";
const DEDUCTION = "Deduction";

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function AdvanceDrawer({
  month,
  today,
  presetStaffId,
  onRecord,
  onClose,
}: {
  /** `YYYY-MM`. */
  month: string;
  /** Africa/Nairobi today — the default date. */
  today: string;
  /** Preselect a staff member (opened from a row). */
  presetStaffId?: string;
  onRecord: (body: PayAdjustmentBody) => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { staff } = useRoster(null);
  const [staffId, setStaffId] = React.useState(presetStaffId ?? "");
  const [type, setType] = React.useState<"advance" | "deduction">("advance");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const staffOptions = React.useMemo(
    () =>
      staff
        .filter((s) => s.active)
        .map((s) => ({
          value: s.id,
          label: `${s.name} · ${ROLE_LABEL[s.role] ?? s.role}`,
        })),
    [staff],
  );

  const canSubmit =
    staffId !== "" &&
    validAmount(amount) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onRecord({
        staffId,
        type,
        amount: amount.trim(),
        date,
        note: note.trim() || undefined,
      });
      toast(
        type === "advance" ? "Advance recorded" : "Deduction recorded",
        { tone: "success" },
      );
      onClose();
    } catch (e) {
      if (e instanceof StaffRequestError) {
        setError(
          e.code === "FORBIDDEN" && e.field !== "type"
            ? "That date falls on a closed day. Pick a date within the open month."
            : e.message,
        );
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
      title="Record advance / deduction"
      subtitle={`Netted off ${monthLabel(month)} pay`}
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
            Save
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <Select
        label="Staff member"
        required
        className="w-full"
        placeholder="Select a staff member…"
        value={staffId}
        onChange={setStaffId}
        options={staffOptions}
      />

      <SegmentedControl
        label="Type"
        options={[ADVANCE, DEDUCTION]}
        value={type === "advance" ? ADVANCE : DEDUCTION}
        onChange={(v) => setType(v === ADVANCE ? "advance" : "deduction")}
      />

      <FormField
        label="Amount"
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
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <FormField
        label="Date"
        required
        hint="Defaults to today. Backdate within the open month if needed."
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

      <FormField label="Note">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — what is this for?"
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        {type === "advance"
          ? "An advance posts to the money ledger on its date — cash leaves the till now and the payout later pays only the balance."
          : "A deduction moves no cash — it only lowers the eventual payout."}
      </div>
    </Drawer>
  );
}
