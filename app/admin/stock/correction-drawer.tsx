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
  /** Human label for the movement's column, e.g. "Kitchen (-)". */
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

// ── Multi-movement breakdown (this session — owner-approved) ───────────────
//
// Previously a cell backed by >1 movement (e.g. two purchases the same day)
// showed a "not designed yet" note and refused to open (Session 7 flag). This
// is the fix: list each constituent movement — quantity, reason (for
// non_sale_consumption), corrected-flag — with its own "Correct" action that
// hands off to <CorrectionDrawer> above for that one movement. Also answers
// the owner's non-sale visibility question: a Non-Sale cell's reason is only
// ever knowable at this per-movement level, never from the aggregated cell.
//
// Scope note: `recordedById` is on StockMovementView but there is no
// resolved staff name on the wire today (no /api/staff join wired into
// use-stock.ts) — "who" is left out of the breakdown rather than guessed or
// wired up as unplanned scope. Flagged for a follow-up if the owner wants it.

const REASON_LABEL: Record<string, string> = {
  staff_meal: "Staff meal",
  complimentary: "Complimentary",
  spoiled: "Spoiled",
  damaged: "Damaged",
  other: "Other",
};

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  purchase_receipt: "Purchase",
  issue: "Kitchen issue",
  non_sale_consumption: "Non-sale consumption",
  production: "Production",
  transfer: "Transfer",
  sale: "Sale",
  variance: "Variance",
};

export type BreakdownTarget = {
  movements: StockMovementView[];
  subtitle: string;
  fieldLabel: string;
  unit: string;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function MovementBreakdownDrawer({
  target,
  onClose,
  onPickMovement,
}: {
  target: BreakdownTarget;
  onClose: () => void;
  /** Called when the user picks one movement to correct — the caller opens
   *  <CorrectionDrawer> for it (same CorrectionTarget shape as a direct
   *  single-movement cell click). */
  onPickMovement: (movement: StockMovementView) => void;
}) {
  return (
    <Drawer
      open
      onClose={onClose}
      title={`${target.fieldLabel} — ${target.movements.length} entries`}
      subtitle={target.subtitle}
      variant="rail"
      footer={
        <Button variant="secondary" className="grow" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="font-ui [color:var(--text-secondary)] text-body/sm">
        This cell is the sum of {target.movements.length} separate entries.
        Pick one to correct it.
      </div>

      <div className="flex flex-col">
        {target.movements.map((m) => {
          const q = Number(m.quantity);
          const reasonLabel = m.reason ? REASON_LABEL[m.reason] ?? m.reason : null;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-(--sp-4) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="flex flex-col gap-(--sp-1) min-w-0">
                <div className="font-ui [color:var(--text-primary)] text-body/sm">
                  {MOVEMENT_TYPE_LABEL[m.movementType] ?? m.movementType}
                  {reasonLabel ? ` · ${reasonLabel}` : ""}
                </div>
                <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                  {fmtTime(m.occurredAt)}
                  {m.reasonNote ? ` · ${m.reasonNote}` : ""}
                  {m.correctsMovementId ? " · corrected" : ""}
                </div>
              </div>
              <div className="flex items-center gap-(--sp-4) shrink-0">
                <span
                  className={`font-mono text-body/sm ${
                    q > 0 ? "text-success" : q < 0 ? "text-danger" : "[color:var(--text-tertiary)]"
                  }`}
                >
                  {fmt1(q)} {target.unit}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => onPickMovement(m)}
                >
                  Correct
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
