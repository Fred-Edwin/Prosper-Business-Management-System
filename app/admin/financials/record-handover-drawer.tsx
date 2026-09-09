"use client";

// ADR-79 — the Admin back-entry drawer: record a handover a staff member
// never declared, dated to the business day it belongs to. Composed from
// the kit rail <Drawer> + <Select> + <FormField> + <Button>, following
// expense-drawer.tsx's create mode for the date field pattern.
//
// POSTs /api/handovers/backdated (recordHandoverForDate) — the Admin-only
// counterpart of the staff POST /api/handovers declare path. No
// MoneyMovement is written either way (ADR-53).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select } from "@/components/kit/select";
import { TextInput } from "@/components/kit/text-input";
import { useToast } from "@/components/kit/toast";
import type { StaffView } from "@/lib/domain/staff";
import { useReconciliation, HandoversRequestError } from "./use-handovers";

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN: "You're not permitted to do this.",
  NOT_FOUND: "That staff member no longer exists.",
  CONFLICT: "A handover for this staff member on this day already exists — correct it instead.",
  VALIDATION_ERROR: "Check the figures and try again.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

/** Staff eligible to have a handover recorded on their behalf. */
const HANDOVER_ROLES = new Set(["cashier", "canteen_attendant"]);

export function RecordHandoverDrawer({
  staff,
  defaultDate,
  recordBackdated,
  onClose,
}: {
  /** Every staff member — filtered to cashier / canteen attendant, active. */
  staff: StaffView[];
  /** `YYYY-MM-DD` — the worksheet's focused day, pre-filled. */
  defaultDate: string;
  recordBackdated: ReturnType<typeof useReconciliation>["recordBackdated"];
  onClose: () => void;
}) {
  const { toast } = useToast();

  const eligible = React.useMemo(
    () =>
      staff.filter(
        (s) => s.active && s.role != null && HANDOVER_ROLES.has(s.role),
      ),
    [staff],
  );
  const staffOptions = React.useMemo(
    () =>
      eligible.map((s) => ({
        value: s.id,
        label: `${s.name} · ${s.locationName}`,
      })),
    [eligible],
  );
  const staffById = React.useMemo(
    () => new Map(eligible.map((s) => [s.id, s])),
    [eligible],
  );

  const [staffId, setStaffId] = React.useState("");
  const [businessDate, setBusinessDate] = React.useState(defaultDate);
  const [cashDeclared, setCashDeclared] = React.useState("");
  const [mpesaDeclared, setMpesaDeclared] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedStaff = staffId ? staffById.get(staffId) ?? null : null;
  const cashValid = MONEY_RE.test(cashDeclared.trim());
  const mpesaValid = MONEY_RE.test(mpesaDeclared.trim());
  const today = new Date().toISOString().slice(0, 10);
  const dateValid = businessDate.length > 0 && businessDate <= today;

  const canSubmit =
    selectedStaff != null && cashValid && mpesaValid && dateValid;

  async function submit() {
    if (!canSubmit || submitting || !selectedStaff) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordBackdated({
        staffId: selectedStaff.id,
        locationId: selectedStaff.locationId,
        cashDeclared: cashDeclared.trim(),
        mpesaDeclared: mpesaDeclared.trim(),
        businessDate,
      });
      toast("Handover recorded", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof HandoversRequestError) {
        setError(CODE_MESSAGE[e.code] ?? e.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const impact = !selectedStaff
    ? "Pick the staff member this handover belongs to."
    : !dateValid
      ? "Pick a business date that isn't in the future."
      : cashValid && mpesaValid
        ? `Records a handover for ${selectedStaff.name} (${selectedStaff.locationName}) on ${businessDate} — cash ${cashDeclared || "0.00"}, M-Pesa ${mpesaDeclared || "0.00"}. Writes no money-ledger row (ADR-53); it shows as "Awaiting receipt" until received.`
        : "Enter the cash and M-Pesa figures they handed over.";

  return (
    <Drawer
      open
      onClose={onClose}
      title="Record a handover"
      subtitle="For a declaration a staff member missed"
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
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            Record handover
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
        placeholder="Select who handed this over…"
        options={staffOptions}
        value={staffId}
        onChange={setStaffId}
        className="w-full"
      />

      <FormField label="Business date" required className="grow">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              type="date"
              max={today}
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
            />
          </div>
        )}
      </FormField>

      <TextInput
        label="Cash declared"
        required
        inputMode="decimal"
        startAdornment="KES"
        placeholder="0.00"
        value={cashDeclared}
        error={cashDeclared.trim().length > 0 && !cashValid}
        onChange={(e) => setCashDeclared(e.target.value)}
        className="w-full"
      />
      <TextInput
        label="M-Pesa declared"
        required
        inputMode="decimal"
        startAdornment="KES"
        placeholder="0.00"
        value={mpesaDeclared}
        error={mpesaDeclared.trim().length > 0 && !mpesaValid}
        onChange={(e) => setMpesaDeclared(e.target.value)}
        className="w-full"
      />

      <CalculatedImpactBanner>{impact}</CalculatedImpactBanner>
    </Drawer>
  );
}
