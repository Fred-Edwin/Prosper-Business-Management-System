"use client";

// M3 S4 — the owner draw / return drawer for /admin/financials. Composed
// from the kit rail <Drawer> + <SegmentedControl> + <FormField> +
// <Button>, following expense-drawer.tsx.
//
// A draw reduces Cash at hand; a return increases it. Both POST
// /api/owner-transactions (recordOwnerTransaction — writes the paired
// MoneyMovement on the cash account).
//
// `mode: "correct"` (ADR-72) reuses the same form prefilled with an
// existing row's CURRENT values; submitting sends the corrected FINAL
// type + amount to /api/owner-transactions/:id/correct (the server writes
// the append-only delta row + paired cash MoneyMovement). A Void-behind-
// confirm section fully reverses the transaction — same confirm-step
// pattern as purchase-payment-correction-drawer.tsx.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { useToast } from "@/components/kit/toast";
import type { OwnerTransactionView } from "@/lib/domain/financials";
import { FinancialsRequestError } from "./use-financials";

const TYPE_LABELS = ["Draw (money out)", "Return (money in)"] as const;
const TYPE_KEY: Record<string, "draw" | "return"> = {
  "Draw (money out)": "draw",
  "Return (money in)": "return",
};
const TYPE_LABEL: Record<"draw" | "return", string> = {
  draw: "Draw (money out)",
  return: "Return (money in)",
};

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  FORBIDDEN: "Only an administrator can record an owner transaction.",
  NOT_FOUND: "That transaction no longer exists — reload the page.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

type CreateInput = {
  type: "draw" | "return";
  amount: string;
  date: string;
  note?: string;
};

export function OwnerDrawDrawer({
  date,
  transaction,
  onCreate,
  onCorrect,
  onVoid,
  onClose,
}: {
  /** The date a NEW draw / return is dated to (create mode). */
  date?: string;
  /** When set, the drawer opens in "correct" mode, prefilled from this row. */
  transaction?: OwnerTransactionView;
  onCreate?: (input: CreateInput) => Promise<unknown>;
  onCorrect?: (
    id: string,
    input: { type: "draw" | "return"; amount: string; note?: string },
  ) => Promise<unknown>;
  onVoid?: (id: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const mode = transaction ? "correct" : "create";

  const [type, setType] = React.useState<"draw" | "return">(
    transaction?.type ?? "draw",
  );
  const [amount, setAmount] = React.useState(
    transaction ? String(Number(transaction.amount)) : "",
  );
  const [entryDate, setEntryDate] = React.useState(date ?? "");
  const [note, setNote] = React.useState(transaction?.note ?? "");
  const [confirmVoid, setConfirmVoid] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<
    "save" | "void" | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    validAmount(amount) &&
    (mode === "correct" || /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) &&
    submitting === null;

  function toMessage(e: unknown): string {
    return e instanceof FinancialsRequestError
      ? (CODE_MESSAGE[e.code] ?? e.message)
      : "Something went wrong. Try again.";
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting("save");
    setError(null);
    try {
      if (mode === "correct" && transaction && onCorrect) {
        await onCorrect(transaction.id, {
          type,
          amount: amount.trim(),
          note: note.trim() || undefined,
        });
        toast("Transaction corrected", { tone: "success" });
      } else if (onCreate) {
        await onCreate({
          type,
          amount: amount.trim(),
          date: entryDate,
          note: note.trim() || undefined,
        });
        toast(type === "draw" ? "Draw recorded" : "Return recorded", {
          tone: "success",
        });
      }
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  async function submitVoid() {
    if (!transaction || !onVoid) return;
    setSubmitting("void");
    setError(null);
    try {
      await onVoid(transaction.id);
      toast("Transaction voided", { tone: "success" });
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === "correct" ? "Correct Owner Draw / Return" : "Owner Draw / Return"}
      subtitle="Money the owner takes out or puts back"
      variant="rail"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting !== null}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting === "save"}
          >
            {mode === "correct"
              ? "Save Correction"
              : type === "draw"
                ? "Record Draw"
                : "Record Return"}
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {mode === "correct" && (
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          A correction is a new linked entry — the original is never
          overwritten. Enter the corrected final values; the Cash at hand
          balance updates to match.
        </div>
      )}

      <SegmentedControl
        label="Type"
        options={[...TYPE_LABELS]}
        value={TYPE_LABEL[type]}
        onChange={(label) => setType(TYPE_KEY[label])}
      />

      <div className="flex gap-(--sp-4)">
        <FormField label="Amount" required className="grow">
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <span className="font-ui shrink-0 [color:var(--text-tertiary)] text-sm/micro">
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
        {mode === "create" && (
          <FormField label="Date" required className="grow">
            {({ id, "aria-describedby": describedBy }) => (
              <div className={fieldBox}>
                <input
                  id={id}
                  aria-describedby={describedBy}
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
                />
              </div>
            )}
          </FormField>
        )}
      </div>

      <FormField label="Note" className="w-full">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        {type === "draw"
          ? "Reduces Cash at hand and raises the amount owed back to the business."
          : "Increases Cash at hand and lowers the amount owed back to the business."}
      </div>

      {mode === "correct" && onVoid && (
        <div className="flex flex-col gap-(--sp-3) pt-(--sp-5) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
            Void this transaction
          </div>
          <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Fully reverses it: the Cash at hand effect and the owed-to-business
            figure go back to what they were before.
          </div>
          {confirmVoid ? (
            <div className="flex items-center gap-(--sp-4)">
              <Button
                variant="destructive"
                size="sm"
                onClick={submitVoid}
                loading={submitting === "void"}
                disabled={submitting !== null}
              >
                Confirm void
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setConfirmVoid(false)}
                disabled={submitting !== null}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmVoid(true)}
                disabled={submitting !== null}
              >
                Void transaction…
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
