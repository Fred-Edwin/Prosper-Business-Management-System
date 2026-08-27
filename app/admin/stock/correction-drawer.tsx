// Wired from docs/design/screens/admin-stock-ledger-drawer-open/page.tsx
// (Paper artboard 7LJ-0 / panel 7S9-0). The panel markup — kit <Drawer
// variant="rail">, the read-only context rows, the error-bordered movement
// field, <CalculatedImpactBanner>, the Reason box, the two footer <Button>s
// — is verbatim from the skeleton. This file adds: the real target movement,
// the corrected-quantity input, the live (cosmetic) delta, the note field,
// and the POST /api/stock-movements/:id/correct call.
//
// ADR-15 / handoff: the drawer submits the CORRECTED FINAL QUANTITY; the
// server computes the delta authoritatively. The delta shown here is
// display-only. Never send a delta.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
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
        <div className="font-ui text-danger text-body/sm">{error}</div>
      )}

      {/* Read-only context row: the current opening for this pair. */}
      <div className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui inline-block [color:var(--text-secondary)] text-body/sm">
          Original entry
        </div>
        <div className="font-mono inline-block text-body/sm [color:var(--text-primary)]">
          {fmt1(original)} {target.unit}
        </div>
      </div>

      {/* Editable movement field (error-bordered when the input is unusable). */}
      <div
        className={`flex flex-col p-(--sp-5) rounded-md gap-(--sp-3) border border-solid ${
          !validNumber || unchanged
            ? "border-danger"
            : "[border-color:var(--border-subtle)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className={`font-ui font-(--weight-medium) inline-block text-body/sm ${
              !validNumber || unchanged
                ? "text-danger"
                : "[color:var(--text-primary)]"
            }`}
          >
            {target.fieldLabel} *
          </div>
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase shrink-0 inline-block w-max [color:var(--text-tertiary)] text-micro/micro">
            Original: {fmt1(original)}
          </div>
        </div>
        <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
          <input
            value={correctedRaw}
            onChange={(e) => setCorrectedRaw(e.target.value)}
            inputMode="decimal"
            aria-label={`Corrected ${target.fieldLabel}`}
            className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
          />
          <div className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
            {target.unit}
          </div>
        </div>
      </div>

      <CalculatedImpactBanner>{impact}</CalculatedImpactBanner>

      <div className="flex flex-col gap-(--sp-3)">
        <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-body/sm">
          Reason for Adjustment
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What changed and why?"
          className="flex min-h-[64px] p-(--sp-5) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)] font-ui [color:var(--text-primary)] text-body/body outline-none resize-y placeholder:[color:var(--text-tertiary)]"
        />
      </div>
    </Drawer>
  );
}
