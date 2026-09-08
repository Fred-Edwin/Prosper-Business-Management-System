"use client";

// ADR-76 — the "Log daily pay" drawer for a `daily_entry` staff member
// (cooks / casuals whose pay is a hand-typed amount per day). Opened from
// a Pay-tab row. Mirrors advance-drawer.tsx: <Drawer> + <Select> +
// <FormField> + <Button> + <Toast>.
//
// POST /api/pay/daily-pay — day-close gated (assertDayOpen on `date`).
// One entry per (staff, business date); a second is CONFLICT — correct
// the existing one from the "Daily pay" review drawer instead. NO cash
// moves — a pay entry only nets the payout later.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import { staffLabel } from "./format";
import { monthLabel } from "./month-picker";
import type { DailyPayBody } from "./use-staff";
import { StaffRequestError, useRoster } from "./use-staff";

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function LogDailyPayDrawer({
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
  onRecord: (body: DailyPayBody) => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { staff } = useRoster(null);
  const [staffId, setStaffId] = React.useState(presetStaffId ?? "");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Only `daily_entry` staff can take a daily pay entry.
  const staffOptions = React.useMemo(
    () =>
      staff
        .filter((s) => s.active && s.payModel === "daily_entry")
        .map((s) => ({
          value: s.id,
          label: `${s.name} · ${staffLabel(s)}`,
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
        amount: amount.trim(),
        date,
        note: note.trim() || undefined,
      });
      toast("Daily pay logged", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof StaffRequestError) {
        setError(
          e.code === "FORBIDDEN"
            ? "That date falls on a closed day. Pick a date within the open month."
            : e.code === "CONFLICT"
              ? "This staff member already has a daily pay entry for that date. Correct the existing entry from the Daily pay list."
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
      title="Log daily pay"
      subtitle={`Counts toward ${monthLabel(month)} gross pay`}
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

      {staffOptions.length === 0 ? (
        <div className="font-ui [color:var(--text-secondary)] text-body/sm">
          No staff are on the daily-entry pay model. Set a staff
          member&apos;s pay model to &ldquo;Daily entry&rdquo; on the
          Roster tab first.
        </div>
      ) : (
        <>
          <Select
            label="Staff member"
            required
            className="w-full"
            placeholder="Select a staff member…"
            value={staffId}
            onChange={setStaffId}
            options={staffOptions}
          />

          <FormField
            label="Amount"
            required
            hint="Today's pay for this staff member. Added to this month's gross pay."
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
            hint="Defaults to today. One entry per staff member per day — backdate within the open month if needed."
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
                  placeholder="Optional — e.g. hours worked, rate"
                  className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
                />
              </div>
            )}
          </FormField>

          <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
            Logging daily pay does not move cash — it only builds up this
            month&apos;s gross pay. Cash moves when you record the payout.
            Fix a wrong entry with Correct / Void from the Daily pay list.
          </div>
        </>
      )}
    </Drawer>
  );
}
