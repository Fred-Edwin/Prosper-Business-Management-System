"use client";

// M3 S3 — the Admin correction drawer for an already-received handover
// row on the Handovers reconciliation tab. Structure + copy follow
// app/admin/stock/correction-drawer.tsx (the sanctioned pattern).
//
// Contract (docs/API.md → POST /api/handovers/:id/correct), discriminated
// on `target`:
//   • "handover" — corrects the DECLARATION. The Admin submits the
//     corrected ABSOLUTE declared figures; the domain computes the delta
//     vs the current derived declared and writes an append-only delta row.
//   • "receipt"  — corrects the RECORDED RECEIPT. The Admin submits the
//     corrected ABSOLUTE received figures; a shortfall still requires a
//     note. Writes a fresh ReceiptOfHandover row (reads take the latest).
//
// One drawer, a segmented pick of which fact to correct. Never sends a
// delta.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { TextInput } from "@/components/kit/text-input";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import { useReconciliation, HandoversRequestError } from "./use-handovers";
import type { ReconciliationRow } from "@/lib/domain/handovers";

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN: "You're not permitted to correct this entry.",
  NOT_FOUND: "That row no longer exists — reload the tab.",
  CONFLICT: "This entry changed elsewhere — reload the tab.",
  VALIDATION_ERROR: "Check the corrected figures and try again.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

function fmtMoney(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : dec;
}

type Target = "handover" | "receipt";

const RECEIPT_OPT = "The receipt";
const DECLARATION_OPT = "The declaration";

export function HandoverCorrectionDrawer({
  row,
  correct,
  onClose,
}: {
  row: ReconciliationRow;
  correct: ReturnType<typeof useReconciliation>["correct"];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const canCorrectReceipt = row.received && row.receiptId != null;

  const [target, setTarget] = React.useState<Target>(
    canCorrectReceipt ? "receipt" : "handover",
  );

  // Declaration fields — seeded with the current derived declared figures.
  const [cashDeclared, setCashDeclared] = React.useState(row.cashDeclared);
  const [mpesaDeclared, setMpesaDeclared] = React.useState(row.mpesaDeclared);

  // Receipt fields — seeded with the current received figures.
  const [cashReceived, setCashReceived] = React.useState(row.cashReceived ?? "");
  const [mpesaReceived, setMpesaReceived] = React.useState(
    row.mpesaReceived ?? "",
  );
  const [note, setNote] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [noteError, setNoteError] = React.useState<string | null>(null);

  const isHandover = target === "handover";

  const cashD = MONEY_RE.test(cashDeclared.trim());
  const mpesaD = MONEY_RE.test(mpesaDeclared.trim());
  const cashR = MONEY_RE.test(cashReceived.trim());
  const mpesaR = MONEY_RE.test(mpesaReceived.trim());

  const declaredValid = cashD && mpesaD;
  const receiptValid = cashR && mpesaR;

  const declaredUnchanged =
    declaredValid &&
    Number(cashDeclared) === Number(row.cashDeclared) &&
    Number(mpesaDeclared) === Number(row.mpesaDeclared);

  const receiptShort =
    receiptValid &&
    (Number(cashReceived) - Number(row.cashDeclared) < 0 ||
      Number(mpesaReceived) - Number(row.mpesaDeclared) < 0);
  const receiptNoteMissing = receiptShort && note.trim().length === 0;

  const canSubmit = isHandover
    ? declaredValid && !declaredUnchanged
    : receiptValid;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setNoteError(null);
    try {
      if (isHandover) {
        await correct(row.handoverId, {
          target: "handover",
          cashDeclared: cashDeclared.trim(),
          mpesaDeclared: mpesaDeclared.trim(),
        });
      } else {
        await correct(row.handoverId, {
          target: "receipt",
          receiptId: row.receiptId as string,
          cashReceived: cashReceived.trim(),
          mpesaReceived: mpesaReceived.trim(),
          shortfallNote: note.trim() || undefined,
        });
      }
      toast("Correction saved", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof HandoversRequestError) {
        if (e.code === "VALIDATION_ERROR" && e.field === "shortfallNote") {
          setNoteError(
            "The corrected receipt is short — add a note explaining the shortfall.",
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

  const impact = isHandover
    ? declaredUnchanged
      ? "The corrected declaration matches the current one — nothing to save."
      : declaredValid
        ? `Declared cash ${fmtMoney(row.cashDeclared)} → ${fmtMoney(
            cashDeclared,
          )}, M-Pesa ${fmtMoney(row.mpesaDeclared)} → ${fmtMoney(
            mpesaDeclared,
          )}. The domain writes an append-only delta row; variances re-derive on save.`
        : "Enter the corrected declared figures to preview the impact."
    : receiptValid
      ? `Received cash → ${fmtMoney(cashReceived)}, M-Pesa → ${fmtMoney(
          mpesaReceived,
        )}. A new receipt row supersedes the previous one; the stored variance is recomputed.`
      : "Enter the corrected received figures to preview the impact.";

  return (
    <Drawer
      open
      onClose={onClose}
      title="Correct this handover"
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
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            Save correction
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {canCorrectReceipt && (
        <SegmentedControl
          aria-label="What to correct"
          options={[RECEIPT_OPT, DECLARATION_OPT]}
          value={target === "receipt" ? RECEIPT_OPT : DECLARATION_OPT}
          onChange={(v) => setTarget(v === RECEIPT_OPT ? "receipt" : "handover")}
        />
      )}

      {isHandover ? (
        <>
          <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Enter the corrected final declared figures — not a delta. The
            server computes the delta against the current derived value.
          </div>
          <TextInput
            label="Corrected declared cash"
            required
            inputMode="decimal"
            startAdornment="KES"
            value={cashDeclared}
            error={cashDeclared.trim().length > 0 && !cashD}
            onChange={(e) => setCashDeclared(e.target.value)}
            className="w-full"
          />
          <TextInput
            label="Corrected declared M-Pesa"
            required
            inputMode="decimal"
            startAdornment="KES"
            value={mpesaDeclared}
            error={mpesaDeclared.trim().length > 0 && !mpesaD}
            onChange={(e) => setMpesaDeclared(e.target.value)}
            className="w-full"
          />
          {declaredUnchanged && (
            <div className="font-ui text-danger text-caption/micro">
              The corrected declaration matches the current one.
            </div>
          )}
        </>
      ) : (
        <>
          <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Enter the corrected final received figures. A shortfall still
            needs a note.
          </div>
          <TextInput
            label="Corrected cash received"
            required
            inputMode="decimal"
            startAdornment="KES"
            value={cashReceived}
            error={cashReceived.trim().length > 0 && !cashR}
            onChange={(e) => setCashReceived(e.target.value)}
            className="w-full"
          />
          <TextInput
            label="Corrected M-Pesa received"
            required
            inputMode="decimal"
            startAdornment="KES"
            value={mpesaReceived}
            error={mpesaReceived.trim().length > 0 && !mpesaR}
            onChange={(e) => setMpesaReceived(e.target.value)}
            className="w-full"
          />
          <Textarea
            label="Shortfall note"
            required={receiptShort}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (noteError) setNoteError(null);
            }}
            error={Boolean(noteError) || receiptNoteMissing}
            helperText={
              noteError ??
              (receiptNoteMissing
                ? "Required — the corrected receipt is short."
                : "Only needed when the corrected receipt is short.")
            }
            placeholder="What was short, and why?"
            className="w-full"
          />
        </>
      )}

      <CalculatedImpactBanner>{impact}</CalculatedImpactBanner>
    </Drawer>
  );
}
