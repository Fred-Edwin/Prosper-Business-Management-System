"use client";

// Void (delete) an expense — ADR-96. Confirm-only, with an optional reason:
// the whole action is a reversing row that nets the expense to zero and
// returns the cash. Sibling of receipt-void-drawer.tsx.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { useToast } from "@/components/kit/toast";
import type { ExpenseView } from "@/lib/domain/financials";
import { FinancialsRequestError } from "./use-financials";

const CATEGORY_LABEL: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  transport: "Transport",
  gas_fuel: "Gas / Fuel",
  salaries: "Salaries",
  repairs: "Repairs",
  other: "Other",
};

const ACCOUNT_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "This expense can't be deleted — reload the page.",
  FORBIDDEN: "Only an administrator can delete an expense.",
  NOT_FOUND: "That expense no longer exists — reload the page.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

export function ExpenseVoidDrawer({
  expense,
  onVoid,
  onClose,
}: {
  expense: ExpenseView;
  onVoid: (id: string, note?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await onVoid(expense.id, note.trim() || undefined);
      toast("Expense deleted", { tone: "success" });
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

  const account = ACCOUNT_LABEL[expense.paidFromAccount] ?? expense.paidFromAccount;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Delete Expense"
      subtitle={`${CATEGORY_LABEL[expense.category] ?? expense.category} · ${expense.date.slice(0, 10)}`}
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            className="grow"
            onClick={submit}
            loading={submitting}
          >
            Delete expense
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="font-ui [color:var(--text-secondary)] text-body/sm">
        This removes the {expense.note ? `"${expense.note}" ` : ""}expense of
        KES {expense.amount} from your totals and returns the money to{" "}
        {account}. The original entry is never erased — a reversing row is
        added and it stays in the audit trail. Turn on "Show deleted" to see it.
      </div>

      <FormField label="Reason (optional)">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              type="text"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="grow bg-transparent outline-none font-ui [color:var(--text-primary)] text-sm/sm"
            />
          </div>
        )}
      </FormField>
    </Drawer>
  );
}
