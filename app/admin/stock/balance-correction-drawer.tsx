// Balance-wide correction (Admin, ADR-72 shape) — sibling of
// correction-drawer.tsx but scoped to a product/location's whole DERIVED
// balance rather than one existing movement row. The drawer submits the
// CORRECTED FINAL BALANCE; the server computes the delta authoritatively.
// Never send a delta.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import { stockApi, StockRequestError } from "./use-stock";

/** What the ledger hands the drawer when the Closing cell is clicked. */
export type BalanceCorrectionTarget = {
  productId: string;
  locationId: string;
  /** The live current derived balance (fetched fresh, not the day's closing figure). */
  currentBalance: string;
  /** e.g. "Canteen · Pudding" — the drawer's context subtitle. */
  subtitle: string;
  /** Unit label, e.g. "portions". */
  unit: string;
};

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN: "Only an administrator can correct a stock balance.",
  NOT_FOUND: "That product or location no longer exists — reload the ledger.",
  VALIDATION_ERROR: "Check the corrected balance and try again.",
  CONFLICT: "This balance was changed elsewhere — reload the ledger.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

function fmt1(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

export function BalanceCorrectionDrawer({
  target,
  onClose,
  onCorrected,
}: {
  target: BalanceCorrectionTarget;
  onClose: () => void;
  /** Called after a successful correction so the caller can refetch. */
  onCorrected: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const current = Number(target.currentBalance);
  const [correctedRaw, setCorrectedRaw] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const corrected = Number(correctedRaw);
  const validNumber = /^-?\d+(\.\d{1,4})?$/.test(correctedRaw.trim());
  const delta = validNumber ? corrected - current : NaN;
  const unchanged = validNumber && delta === 0;
  const noteMissing = note.trim().length === 0;
  const canSubmit = validNumber && !unchanged && !noteMissing && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await stockApi.correctBalance({
        productId: target.productId,
        locationId: target.locationId,
        correctedBalance: correctedRaw.trim(),
        note: note.trim(),
      });
      await onCorrected();
      toast("Balance corrected", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof StockRequestError) {
        setError(CODE_MESSAGE[e.code] ?? e.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const impact = !validNumber
    ? "Enter a corrected balance to preview the impact."
    : unchanged
      ? "The corrected balance matches the current one — nothing to save."
      : `Setting the balance to ${fmt1(corrected)}${target.unit} applies a ${
          delta > 0 ? "+" : ""
        }${delta.toFixed(2)} ${target.unit} adjustment. This does not affect cash, M-Pesa, or any financial figures.`;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Correct Stock Balance"
      subtitle={target.subtitle}
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting}
          >
            Confirm &amp; Save Correction
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui [color:var(--text-secondary)] text-body/sm">
          Current balance
        </div>
        <div className="font-mono text-body/sm [color:var(--text-primary)]">
          {fmt1(current)} {target.unit}
        </div>
      </div>

      <FormField
        label="Corrected balance"
        required
        error={
          correctedRaw.trim().length > 0 && (!validNumber || unchanged)
            ? unchanged
              ? "The corrected balance matches the current one."
              : "Enter a valid number (up to 4 decimal places)."
            : undefined
        }
        hint={`Current: ${fmt1(current)} ${target.unit}`}
        className="w-full"
      >
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <div
            className={`flex items-center justify-between h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid kit-field ${
              invalid ? "border-danger" : "[border-color:var(--border-strong)]"
            }`}
            data-invalid={invalid || undefined}
          >
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={correctedRaw}
              onChange={(e) => setCorrectedRaw(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
            />
            <div className="font-ui shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              {target.unit}
            </div>
          </div>
        )}
      </FormField>

      <CalculatedImpactBanner>{impact}</CalculatedImpactBanner>

      <Textarea
        label="Reason for correction"
        required
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why is the recorded balance being reset?"
        className="w-full"
      />
    </Drawer>
  );
}
