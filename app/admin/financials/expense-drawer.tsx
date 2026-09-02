"use client";

// M3 S4 — the expense entry / correction drawer for /admin/financials.
// Composed from the kit rail <Drawer> + <Select> + <FormField> +
// <SegmentedControl> + <Button>, following payment-drawer.tsx.
//
//   mode "create"  → category / amount / date / paid-from / note; POSTs
//                    /api/expenses (recordExpense — writes the paired
//                    negative MoneyMovement).
//   mode "correct" → amount + note only (category / date / account are
//                    fixed on the original); POSTs /api/expenses/:id/correct
//                    (append-only delta row, ADR-15).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import type {
  ExpenseCategory,
  ExpenseView,
  RecordExpenseInput,
} from "@/lib/domain/financials";
import { FinancialsRequestError } from "./use-financials";

const CATEGORY_OPTIONS = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "transport", label: "Transport" },
  { value: "gas_fuel", label: "Gas / Fuel" },
  { value: "salaries", label: "Salaries" },
  { value: "repairs", label: "Repairs" },
  { value: "other", label: "Other" },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

const PAID_FROM_LABELS = ["Cash", "M-Pesa / Bank Till"] as const;
const PAID_FROM_KEY: Record<string, "cash" | "mpesa_bank"> = {
  Cash: "cash",
  "M-Pesa / Bank Till": "mpesa_bank",
};
const PAID_FROM_LABEL: Record<"cash" | "mpesa_bank", string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  FORBIDDEN: "Only an administrator can record an expense.",
  NOT_FOUND: "That expense no longer exists.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function ExpenseDrawer({
  mode,
  date,
  target,
  onCreate,
  onCorrect,
  onClose,
}: {
  mode: "create" | "correct";
  /** `YYYY-MM-DD` — the toolbar date, prefilled on a new expense. */
  date: string;
  /** The row being corrected (mode "correct" only). */
  target?: ExpenseView;
  onCreate: (input: RecordExpenseInput) => Promise<unknown>;
  onCorrect: (id: string, amount: string, note?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isCorrect = mode === "correct";

  const [category, setCategory] = React.useState<string>(
    target?.category ?? "",
  );
  const [amount, setAmount] = React.useState<string>(
    isCorrect ? (target?.amount ?? "") : "",
  );
  const [entryDate, setEntryDate] = React.useState<string>(
    target ? target.date.slice(0, 10) : date,
  );
  const [paidFrom, setPaidFrom] = React.useState<"cash" | "mpesa_bank">(
    target?.paidFromAccount ?? "cash",
  );
  const [note, setNote] = React.useState<string>(target?.note ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    validAmount(amount) &&
    (isCorrect || (category !== "" && /^\d{4}-\d{2}-\d{2}$/.test(entryDate))) &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isCorrect && target) {
        await onCorrect(target.id, amount.trim(), note.trim() || undefined);
        toast("Expense corrected", { tone: "success" });
      } else {
        await onCreate({
          category: category as ExpenseCategory,
          amount: amount.trim(),
          date: entryDate,
          paidFromAccount: paidFrom,
          note: note.trim() || undefined,
        });
        toast("Expense recorded", { tone: "success" });
      }
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
      title={isCorrect ? "Correct Expense" : "Record Expense"}
      subtitle={
        isCorrect
          ? `${CATEGORY_LABEL[target?.category ?? ""] ?? ""} · ${target?.date.slice(0, 10) ?? ""}`
          : "Business expense"
      }
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
            {isCorrect ? "Save Correction" : "Record Expense"}
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {isCorrect && (
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          A correction is a new linked entry — the original is never
          overwritten. Enter the corrected total amount.
        </div>
      )}

      {!isCorrect && (
        <Select
          label="Category"
          required
          className="w-full"
          placeholder="Select a category…"
          value={category}
          onChange={setCategory}
          options={[...CATEGORY_OPTIONS]}
        />
      )}

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

        {!isCorrect && (
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

      {!isCorrect && (
        <SegmentedControl
          label="Paid From"
          options={[...PAID_FROM_LABELS]}
          value={PAID_FROM_LABEL[paidFrom]}
          onChange={(label) => setPaidFrom(PAID_FROM_KEY[label])}
        />
      )}

      <FormField label="Note" className="w-full">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — what was this for?"
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      {!isCorrect && (
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
          This debits the selected account immediately and reduces Net
          Profit for the period.
        </div>
      )}
    </Drawer>
  );
}
