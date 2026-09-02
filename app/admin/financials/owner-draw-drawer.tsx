"use client";

// M3 S4 — the owner draw / return drawer for /admin/financials. Composed
// from the kit rail <Drawer> + <SegmentedControl> + <FormField> +
// <Button>, following expense-drawer.tsx.
//
// A draw reduces Cash at hand; a return increases it. Both POST
// /api/owner-transactions (recordOwnerTransaction — writes the paired
// MoneyMovement on the cash account).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { useToast } from "@/components/kit/toast";
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
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function OwnerDrawDrawer({
  date,
  onCreate,
  onClose,
}: {
  date: string;
  onCreate: (input: {
    type: "draw" | "return";
    amount: string;
    date: string;
    note?: string;
  }) => Promise<unknown>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = React.useState<"draw" | "return">("draw");
  const [amount, setAmount] = React.useState("");
  const [entryDate, setEntryDate] = React.useState(date);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    validAmount(amount) &&
    /^\d{4}-\d{2}-\d{2}$/.test(entryDate) &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        type,
        amount: amount.trim(),
        date: entryDate,
        note: note.trim() || undefined,
      });
      toast(type === "draw" ? "Draw recorded" : "Return recorded", {
        tone: "success",
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof FinancialsRequestError
          ? (CODE_MESSAGE[e.code] ?? e.message)
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Owner Draw / Return"
      subtitle="Money the owner takes out or puts back"
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
            {type === "draw" ? "Record Draw" : "Record Return"}
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
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
    </Drawer>
  );
}
