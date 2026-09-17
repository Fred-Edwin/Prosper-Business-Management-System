"use client";

// Correct or void a supplier purchase payment (ADR-15). Composed from the
// kit rail <Drawer> + <FormField> + <SegmentedControl> + <Button> +
// <Toast>, following payment-drawer.tsx. The form submits the CORRECTED
// FINAL values; the server (correctPurchasePayment) computes the cost
// delta and writes the append-only correction row + paired MoneyMovement.
// "Void" fully reverses the payment.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import type { StockMovementView } from "@/lib/domain/stock";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import {
  stockApi,
  StockRequestError,
  type CorrectPurchasePaymentInput,
} from "../stock/use-stock";
import { useSuppliers, suppliersApi } from "./use-suppliers";

const ADD_NEW_SUPPLIER = "__add_new_supplier__";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  FORBIDDEN: "Only an administrator can correct a purchase payment.",
  NOT_FOUND: "That payment no longer exists — reload the page.",
  CONFLICT:
    "A delivery is matched to this payment. Unmatch or correct the delivery first.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const PAID_FROM_LABELS = ["Cash", "M-Pesa / Bank Till"] as const;
const PAID_FROM_KEY: Record<string, "cash" | "mpesa_bank"> = {
  Cash: "cash",
  "M-Pesa / Bank Till": "mpesa_bank",
};
const PAID_FROM_LABEL: Record<"cash" | "mpesa_bank", string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validQty = (v: string) => /^\d+(\.\d{1,4})?$/.test(v.trim());
const validCost = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function PurchasePaymentCorrectionDrawer({
  payment,
  product,
  onClose,
  onDone,
}: {
  payment: StockMovementView;
  product?: ProductWithLocations;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const unit = product?.unitLabel ?? "unit";

  const { suppliers, addLocal: addLocalSupplier } = useSuppliers();
  // Pre-select by name match against the payment's existing free-text
  // supplier — it may not match any current Supplier row (typed before
  // Suppliers existed, or since renamed/archived), in which case nothing is
  // pre-selected but the original name still shows in the drawer's title.
  const [supplierId, setSupplierId] = React.useState("");
  const [addingSupplier, setAddingSupplier] = React.useState(false);
  const [newSupplierName, setNewSupplierName] = React.useState("");
  const [savingSupplier, setSavingSupplier] = React.useState(false);
  React.useEffect(() => {
    if (!payment.purchaseSupplier || suppliers.length === 0) return;
    const match = suppliers.find(
      (s) => s.name.toLowerCase() === payment.purchaseSupplier?.toLowerCase(),
    );
    if (match) setSupplierId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);
  const supplierOptions = React.useMemo(
    () => [
      { value: ADD_NEW_SUPPLIER, label: "+ Add new supplier…" },
      ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ],
    [suppliers],
  );
  // No `Supplier` row selected (nothing matched, or the Admin hasn't picked
  // one yet) falls back to the payment's original free-text name, so simply
  // opening this drawer and correcting the quantity/cost doesn't silently
  // clear an unmatched supplier name.
  const selectedSupplierName = supplierId
    ? (suppliers.find((s) => s.id === supplierId)?.name ?? "")
    : (payment.purchaseSupplier ?? "");

  async function submitNewSupplier() {
    const name = newSupplierName.trim();
    if (!name) return;
    setSavingSupplier(true);
    try {
      const created = await suppliersApi.create({ name });
      addLocalSupplier(created);
      setSupplierId(created.id);
      setAddingSupplier(false);
      setNewSupplierName("");
    } catch {
      // Same non-fatal handling as the payment drawer's inline add.
    } finally {
      setSavingSupplier(false);
    }
  }
  const [orderedQty, setOrderedQty] = React.useState(
    payment.purchaseOrderedQty
      ? String(Number(payment.purchaseOrderedQty))
      : "",
  );
  const [cost, setCost] = React.useState(
    payment.purchaseTotalCost ? String(Number(payment.purchaseTotalCost)) : "",
  );
  const [paidFrom, setPaidFrom] = React.useState<"cash" | "mpesa_bank">(
    payment.purchasePaidFrom ?? "cash",
  );
  const [confirmVoid, setConfirmVoid] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<"correct" | "void" | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    validQty(orderedQty) && validCost(cost) && submitting === null;

  function toMessage(e: unknown): string {
    return e instanceof StockRequestError
      ? (CODE_MESSAGE[e.code] ?? e.message)
      : "Something went wrong. Try again.";
  }

  async function submitCorrect() {
    if (!canSubmit) return;
    setSubmitting("correct");
    setError(null);
    try {
      const input: CorrectPurchasePaymentInput = {
        movementId: payment.id,
        supplier: selectedSupplierName || undefined,
        orderedQty: orderedQty.trim(),
        cost: cost.trim(),
        paidFromAccount: paidFrom,
      };
      await stockApi.correctPurchasePayment(input);
      await onDone();
      toast("Payment corrected", { tone: "success" });
      onClose();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  async function submitVoid() {
    setSubmitting("void");
    setError(null);
    try {
      await stockApi.voidPurchasePayment(payment.id);
      await onDone();
      toast("Payment voided", { tone: "success" });
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
      title="Correct Purchase Payment"
      subtitle={
        product
          ? `${product.name} · ${payment.purchaseSupplier ?? "no supplier"}`
          : (payment.purchaseSupplier ?? "Purchase payment")
      }
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
            onClick={submitCorrect}
            disabled={!canSubmit}
            loading={submitting === "correct"}
          >
            Save Correction
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        A correction is a new linked entry — the original is never
        overwritten. Enter the corrected final values; the cash / M-Pesa
        balance and the catalog buying price update to match.
      </div>

      {addingSupplier ? (
        <FormField label="New supplier name" className="w-full">
          {({ id, "aria-describedby": describedBy }) => (
            <div className="flex flex-col gap-(--sp-2) w-full">
              <div className={fieldBox}>
                <input
                  id={id}
                  aria-describedby={describedBy}
                  autoFocus
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="e.g. Chieni Wholesale"
                  className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
                />
              </div>
              <div className="flex gap-(--sp-3)">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAddingSupplier(false);
                    setNewSupplierName("");
                  }}
                  disabled={savingSupplier}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={submitNewSupplier}
                  disabled={!newSupplierName.trim()}
                  loading={savingSupplier}
                >
                  Add supplier
                </Button>
              </div>
            </div>
          )}
        </FormField>
      ) : (
        <Select
          label="Supplier / Vendor"
          searchable
          className="w-full"
          placeholder={payment.purchaseSupplier ?? "Select a supplier…"}
          noMatchesLabel="No suppliers match"
          options={supplierOptions}
          value={supplierId}
          onChange={(v) => {
            if (v === ADD_NEW_SUPPLIER) {
              setAddingSupplier(true);
              return;
            }
            setSupplierId(v);
          }}
        />
      )}

      <div className="flex gap-(--sp-4)">
        <FormField label="Quantity" required className="grow">
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <input
                id={id}
                aria-describedby={describedBy}
                value={orderedQty}
                onChange={(e) => setOrderedQty(e.target.value)}
                inputMode="decimal"
                placeholder="0.0"
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                {unit}
              </span>
            </div>
          )}
        </FormField>

        <FormField label="Total Cost" required className="grow">
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                KES
              </span>
              <input
                id={id}
                aria-describedby={describedBy}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>
      </div>

      <SegmentedControl
        label="Paid From"
        options={[...PAID_FROM_LABELS]}
        value={PAID_FROM_LABEL[paidFrom]}
        onChange={(label) => setPaidFrom(PAID_FROM_KEY[label])}
      />

      {/* ── Void ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-(--sp-3) pt-(--sp-5) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          Void this payment
        </div>
        <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          Fully reverses the payment: refunds the paid-from account and
          rolls the catalog buying price back to what it was before.
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
              Void payment…
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
