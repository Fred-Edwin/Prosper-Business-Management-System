"use client";

// M3 S3 — the Admin "Record receipt" drawer, opened from an un-received
// row on the Handovers reconciliation tab. Composed from the kit rail
// <Drawer> + <TextInput> + <Textarea> + <CalculatedImpactBanner> +
// <Button> + <Toast> — the same shape as app/admin/stock/correction-drawer.
//
// Contract (docs/API.md → POST /api/handovers/:id/receive):
//   • body: { cashReceived, mpesaReceived, shortfallNote? }  (decimal strings)
//   • when EITHER received figure is below the declared figure, the domain
//     returns VALIDATION_ERROR on field "shortfallNote" if the note is
//     missing. We surface that inline off the response — AND pre-flag the
//     field client-side so the Admin isn't surprised, but submission is
//     never blocked purely client-side (the server is the gate).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { TextInput } from "@/components/kit/text-input";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import {
  useReconciliation,
  HandoversRequestError,
} from "./use-handovers";
import type { ReconciliationRow } from "@/lib/domain/handovers";

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN: "This day is closed, or you're not permitted to record this.",
  NOT_FOUND: "That handover no longer exists — reload the tab.",
  CONFLICT: "A receipt was already recorded — reload and use the correction.",
  VALIDATION_ERROR: "Check the figures and try again.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

/** "5,000.00" from a "5000.00" decimal string. */
function fmtMoney(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : dec;
}

/** Valid non-negative money string, up to 2dp. */
const MONEY_RE = /^\d+(\.\d{1,2})?$/;

export function ReceiptDrawer({
  row,
  recordReceipt,
  onClose,
}: {
  row: ReconciliationRow;
  recordReceipt: ReturnType<typeof useReconciliation>["recordReceipt"];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [cash, setCash] = React.useState(row.cashDeclared);
  const [mpesa, setMpesa] = React.useState(row.mpesaDeclared);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [noteError, setNoteError] = React.useState<string | null>(null);

  const cashValid = MONEY_RE.test(cash.trim());
  const mpesaValid = MONEY_RE.test(mpesa.trim());
  const figuresValid = cashValid && mpesaValid;

  const cashVar = cashValid ? Number(cash) - Number(row.cashDeclared) : NaN;
  const mpesaVar = mpesaValid ? Number(mpesa) - Number(row.mpesaDeclared) : NaN;
  const isShort =
    (cashValid && cashVar < 0) || (mpesaValid && mpesaVar < 0);
  const noteRequiredNow = isShort && note.trim().length === 0;

  async function submit() {
    if (!figuresValid || submitting) return;
    setSubmitting(true);
    setError(null);
    setNoteError(null);
    try {
      await recordReceipt(row.handoverId, {
        cashReceived: cash.trim(),
        mpesaReceived: mpesa.trim(),
        shortfallNote: note.trim() || undefined,
      });
      toast("Receipt recorded", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof HandoversRequestError) {
        if (e.code === "VALIDATION_ERROR" && e.field === "shortfallNote") {
          setNoteError(
            "This handover is short — add a note explaining the shortfall.",
          );
        } else {
          setError(CODE_MESSAGE[e.code] ?? e.message);
        }
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const varLine = (label: string, v: number, valid: boolean): React.ReactNode => {
    if (!valid) return null;
    const tone =
      v < 0 ? "text-danger" : v > 0 ? "text-success" : "[color:var(--text-secondary)]";
    const sign = v > 0 ? "+" : "";
    return (
      <div className="flex items-center justify-between">
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {label} variance
        </span>
        <span className={`font-mono ${tone} text-sm/sm`}>
          {sign}
          {v.toFixed(2)}
        </span>
      </div>
    );
  };

  const impact = !figuresValid
    ? "Enter the cash and M-Pesa you actually received to preview the variance."
    : isShort
      ? "This handover is short on at least one channel. A shortfall note is required — it is recorded against the declaring staff member."
      : "Received matches or exceeds the declaration. No shortfall note needed.";

  return (
    <Drawer
      open
      onClose={onClose}
      title="Record receipt"
      subtitle={`${row.staffName} · ${row.locationName}`}
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
            disabled={!figuresValid || submitting}
            loading={submitting}
          >
            Confirm receipt
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {/* Declared context — the current derived figures (incl. corrections). */}
      <div className="flex flex-col gap-(--sp-3) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <span className="font-ui [color:var(--text-secondary)] text-body/sm">
            Declared cash
          </span>
          <span className="font-mono [color:var(--text-primary)] text-body/sm">
            KES {fmtMoney(row.cashDeclared)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-ui [color:var(--text-secondary)] text-body/sm">
            Declared M-Pesa
          </span>
          <span className="font-mono [color:var(--text-primary)] text-body/sm">
            KES {fmtMoney(row.mpesaDeclared)}
          </span>
        </div>
      </div>

      <TextInput
        label="Cash received"
        required
        inputMode="decimal"
        startAdornment="KES"
        value={cash}
        error={cash.trim().length > 0 && !cashValid}
        helperText={
          cash.trim().length > 0 && !cashValid
            ? "Enter a number with up to 2 decimal places."
            : undefined
        }
        onChange={(e) => setCash(e.target.value)}
        className="w-full"
      />

      <TextInput
        label="M-Pesa received"
        required
        inputMode="decimal"
        startAdornment="KES"
        value={mpesa}
        error={mpesa.trim().length > 0 && !mpesaValid}
        helperText={
          mpesa.trim().length > 0 && !mpesaValid
            ? "Enter a number with up to 2 decimal places."
            : undefined
        }
        onChange={(e) => setMpesa(e.target.value)}
        className="w-full"
      />

      <CalculatedImpactBanner>
        <div className="flex flex-col gap-(--sp-2)">
          <span>{impact}</span>
          {varLine("Cash", cashVar, cashValid)}
          {varLine("M-Pesa", mpesaVar, mpesaValid)}
        </div>
      </CalculatedImpactBanner>

      <Textarea
        label="Shortfall note"
        required={isShort}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          if (noteError) setNoteError(null);
        }}
        error={Boolean(noteError) || noteRequiredNow}
        helperText={
          noteError ??
          (noteRequiredNow
            ? "Required — this handover is short on at least one channel."
            : "Only needed when the receipt is short.")
        }
        placeholder="What was short, and why?"
        className="w-full"
      />
    </Drawer>
  );
}
