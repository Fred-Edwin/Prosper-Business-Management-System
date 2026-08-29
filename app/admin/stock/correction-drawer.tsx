// Session 11 rebuild — composed from the kit rail <Drawer> + <FormField> +
// <Textarea> + <CalculatedImpactBanner> + <Button> + <Toast>. The previous
// version hand-rolled the field box and the reason <textarea>.
//
// ADR-15 / handoff: the drawer submits the CORRECTED FINAL QUANTITY; the server
// computes the delta authoritatively. The delta shown here is display-only.
// Never send a delta. The POST /api/stock-movements/:id/correct call, the
// validity gate, and the (cosmetic) impact preview are preserved verbatim.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import type { StockMovementView } from "@/lib/domain/stock";
import { stockApi, StockRequestError } from "./use-stock";

/** What the ledger hands the drawer when a single-movement cell is clicked. */
export type CorrectionTarget = {
  movement: StockMovementView;
  /** e.g. "Store · Beef Fillet (kg) · Aug 24" — the drawer's context subtitle. */
  subtitle: string;
  /** Human label for the movement's column, e.g. "Kitchen Issue (-)". */
  fieldLabel: string;
  /** Unit label, e.g. "kg". */
  unit: string;
};

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN:
    "This day is closed, or you're not permitted to correct this entry.",
  NOT_FOUND: "That movement no longer exists — reload the ledger.",
  VALIDATION_ERROR: "Check the corrected quantity and try again.",
  CONFLICT: "This entry was changed elsewhere — reload the ledger.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

function fmt1(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

export function CorrectionDrawer({
  target,
  onClose,
  onCorrected,
}: {
  target: CorrectionTarget;
  onClose: () => void;
  /** Called after a successful correction so the caller can refetch. */
  onCorrected: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const original = Number(target.movement.quantity);
  const [correctedRaw, setCorrectedRaw] = React.useState(
    target.movement.quantity,
  );
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const corrected = Number(correctedRaw);
  const validNumber = /^-?\d+(\.\d{1,4})?$/.test(correctedRaw.trim());
  const delta = validNumber ? corrected - original : NaN;
  const unchanged = validNumber && delta === 0;
  const fieldInvalid = !validNumber || unchanged;

  async function submit() {
    if (!validNumber || unchanged || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await stockApi.correct({
        movementId: target.movement.id,
        correctedQuantity: correctedRaw.trim(),
        note: note.trim() || undefined,
      });
      await onCorrected();
      toast("Correction saved", { tone: "success" });
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
    ? "Enter a corrected quantity to preview the impact."
    : unchanged
      ? "The corrected quantity matches the current one — nothing to save."
      : `Modifying ${target.fieldLabel} from ${fmt1(original)}${target.unit} → ${fmt1(
          corrected,
        )}${target.unit} applies a ${delta > 0 ? "+" : ""}${delta.toFixed(
          2,
        )} ${target.unit} delta. The Store Closing figure updates to the derived value on save.`;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Adjust Row Movements"
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
            disabled={!validNumber || unchanged || submitting}
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

      {/* Read-only context row: the current opening for this pair. */}
      <div className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui [color:var(--text-secondary)] text-body/sm">
          Original entry
        </div>
        <div className="font-mono text-body/sm [color:var(--text-primary)]">
          {fmt1(original)} {target.unit}
        </div>
      </div>

      {/* Editable movement field — composed with <FormField> so the §9.8
          helper/error row + aria wiring come from one place. */}
      <FormField
        label={`${target.fieldLabel}`}
        required
        error={
          fieldInvalid
            ? unchanged
              ? "The corrected quantity matches the current one."
              : "Enter a valid number (up to 4 decimal places)."
            : undefined
        }
        hint={`Original: ${fmt1(original)} ${target.unit}`}
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
        label="Reason for Adjustment"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What changed and why?"
        className="w-full"
      />
    </Drawer>
  );
}
