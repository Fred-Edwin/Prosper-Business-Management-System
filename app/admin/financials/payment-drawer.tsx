// Session 11 rebuild — composed from the kit rail <Drawer> + <FormField> +
// <Select> + <SegmentedControl> + <Button> + <Toast>. The previous version
// hand-rolled every field box and a bespoke "Paid From" button pair. The form
// state and the POST /api/stock-movements { movementType: "purchase_payment" }
// call (recordPurchasePayment — quantity 0, MoneyMovement debit is F3) are
// preserved verbatim.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { StockMovementView } from "@/lib/domain/stock";
import { stockApi, StockRequestError } from "../stock/use-stock";
import { useSuppliers, suppliersApi } from "./use-suppliers";

const ADD_NEW_SUPPLIER = "__add_new_supplier__";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  FORBIDDEN: "Only an administrator can record a purchase payment.",
  NOT_FOUND: "That product or location no longer exists.",
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

export function PaymentDrawer({
  products,
  locations,
  onClose,
  onRecorded,
  preselectedProductId,
  matchReceipt,
}: {
  products: ProductWithLocations[];
  locations: Location[];
  onClose: () => void;
  onRecorded: () => void | Promise<void>;
  /** Reconciliation "Record payment" action pre-selects the delivered product. */
  preselectedProductId?: string;
  /**
   * Set when opened from a specific unmatched delivery's "Record payment"
   * link (Deliveries tab). Pre-fills + locks Product/Destination/Quantity
   * to what was actually received, and the submitted payment links back to
   * this receipt (`purchaseReceiptId`) instead of creating a second,
   * unmatched delivery — the bug this drawer used to cause when goods were
   * received before payment.
   */
  matchReceipt?: StockMovementView | null;
}) {
  const { toast } = useToast();
  // The payment-drawer product picker only ever offers `ingredient` + `goods`
  // — a Dish is never purchased from a supplier (its cost is derived from
  // ingredients, ADR-33). ADR-46 §6.
  const purchasableProducts = React.useMemo(
    () => products.filter((p) => p.kind !== "dish"),
    [products],
  );
  const { suppliers, addLocal: addLocalSupplier } = useSuppliers();
  const [supplierId, setSupplierId] = React.useState("");
  const [addingSupplier, setAddingSupplier] = React.useState(false);
  const [newSupplierName, setNewSupplierName] = React.useState("");
  const [savingSupplier, setSavingSupplier] = React.useState(false);
  const supplierOptions = React.useMemo(
    () => [
      { value: ADD_NEW_SUPPLIER, label: "+ Add new supplier…" },
      ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ],
    [suppliers],
  );
  const selectedSupplierName =
    suppliers.find((s) => s.id === supplierId)?.name ?? "";

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
      // Inline creation failure — the drawer's own submit error banner
      // covers the main flow; a failed supplier add just leaves the mini
      // form open so the Admin can retry or cancel.
    } finally {
      setSavingSupplier(false);
    }
  }
  const [productId, setProductId] = React.useState(
    matchReceipt?.productId ?? preselectedProductId ?? "",
  );
  const [locationId, setLocationId] = React.useState(
    matchReceipt?.locationId ?? "",
  );
  const [quantity, setQuantity] = React.useState(matchReceipt?.quantity ?? "");
  const [unitCost, setUnitCost] = React.useState("");
  const [cost, setCost] = React.useState("");
  // Total cost is normally derived (quantity × unit cost) — the Admin can
  // still type into Total Cost directly, which stops the auto-fill until
  // either Quantity or Unit Cost is edited again.
  const [costManuallyEdited, setCostManuallyEdited] = React.useState(false);
  const [paidFrom, setPaidFrom] = React.useState<"cash" | "mpesa_bank">("cash");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const product = purchasableProducts.find((p) => p.id === productId);

  // ADR-69 §2b — the Destination only offers locations legal for the
  // selected product's kind under ADR-67's location↔kind model:
  //   ingredient → the Store only
  //   goods      → the Restaurant / Canteen (goods may not sit at a Store)
  // Without this the Admin could pay for a delivery whose receipt R1 would
  // later reject (goods → Store), i.e. an unreceivable dead-end row that
  // no staff screen can clear. This is a UX narrowing; the domain guard on
  // the receipt stays the enforcement point. Before a product is picked
  // the list is empty — the field is `required`, so nothing can submit.
  const validDestinations = React.useMemo(() => {
    if (!product) return [];
    return locations.filter((l) =>
      product.kind === "ingredient"
        ? l.type === "store"
        : l.type === "restaurant" || l.type === "canteen",
    );
  }, [locations, product]);

  // Changing the product to an incompatible kind must not leave a stale
  // (now illegal) destination selected and submittable.
  React.useEffect(() => {
    if (locationId && !validDestinations.some((l) => l.id === locationId)) {
      setLocationId("");
    }
  }, [validDestinations, locationId]);

  // Prefill Unit Cost from the product's current catalog buying price — a
  // starting point the Admin can overwrite; it is never forced back.
  React.useEffect(() => {
    if (product?.buyingPrice) setUnitCost(product.buyingPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const validQty = /^\d+(\.\d{1,4})?$/.test(quantity.trim());
  const validUnitCost = /^\d+(\.\d{1,2})?$/.test(unitCost.trim());
  const validCost = /^\d+(\.\d{1,2})?$/.test(cost.trim());
  const canSubmit =
    productId !== "" &&
    locationId !== "" &&
    validQty &&
    validCost &&
    !submitting;

  // Total Cost auto-fills from Quantity × Unit Cost. Once the Admin types
  // into Total Cost directly, auto-fill stops until Quantity or Unit Cost
  // changes again (editing either resumes deriving Total Cost).
  React.useEffect(() => {
    setCostManuallyEdited(false);
  }, [quantity, unitCost]);

  React.useEffect(() => {
    if (costManuallyEdited) return;
    if (!validQty || !validUnitCost) return;
    const computed = Number(quantity.trim()) * Number(unitCost.trim());
    setCost(computed.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, unitCost, costManuallyEdited]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await stockApi.recordPurchasePayment({
        productId,
        locationId,
        supplier: selectedSupplierName || undefined,
        quantity: quantity.trim(),
        cost: cost.trim(),
        paidFromAccount: paidFrom,
        purchaseReceiptId: matchReceipt?.id ?? null,
      });
      await onRecorded();
      toast("Payment recorded", { tone: "success" });
      onClose();
    } catch (e) {
      setError(
        e instanceof StockRequestError
          ? (CODE_MESSAGE[e.code] ?? e.message)
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const fieldBox =
    "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

  return (
    <Drawer
      open
      onClose={onClose}
      title="Record Purchase Payment"
      subtitle="2-Way Delivery Matching"
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
            Record Payment
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {matchReceipt && (
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro rounded-sm bg-(--surface-selected) px-(--sp-5) py-(--sp-4)">
          Settling a delivery already received — Product, Destination and
          Quantity are locked to what was received so this payment links to
          it instead of creating a second, unmatched delivery.
        </div>
      )}

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
                  placeholder="e.g. Farmer's Choice Butchery"
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
          placeholder="Select a supplier…"
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

      <div className="flex flex-col gap-(--sp-2) w-full">
        <Select
          label="Product"
          required
          searchable
          disabled={Boolean(matchReceipt)}
          noMatchesLabel="No products match"
          className="w-full"
          placeholder="Select a product…"
          value={productId}
          onChange={setProductId}
          options={purchasableProducts.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.unitLabel})`,
          }))}
        />
        <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          Ingredients &amp; Goods only — a Dish is never purchased
        </div>
      </div>

      <div className="flex flex-col gap-(--sp-2) w-full">
        <Select
          label="Destination"
          required
          disabled={Boolean(matchReceipt)}
          className="w-full"
          placeholder={
            product ? "Select a location…" : "Select a product first…"
          }
          value={locationId}
          onChange={setLocationId}
          options={validDestinations.map((l) => ({
            value: l.id,
            label: l.name,
          }))}
        />
        {product && (
          <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {product.kind === "ingredient"
              ? "Ingredients are delivered to the Store"
              : "Goods are delivered to the Restaurant or Canteen — never the Store"}
          </div>
        )}
      </div>

      <div className="flex gap-(--sp-4)">
        <FormField label="Quantity" required className="grow">
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <input
                id={id}
                aria-describedby={describedBy}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={Boolean(matchReceipt)}
                inputMode="decimal"
                placeholder="0.0"
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)] disabled:opacity-60"
              />
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                {product?.unitLabel ?? "unit"}
              </span>
            </div>
          )}
        </FormField>
      </div>

      <div className="flex gap-(--sp-4)">
        <FormField label="Unit Cost" required className="grow">
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                KES
              </span>
              <input
                id={id}
                aria-describedby={describedBy}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
              />
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                / {product?.unitLabel ?? "unit"}
              </span>
            </div>
          )}
        </FormField>
        <FormField
          label="Total Cost"
          required
          hint={
            !costManuallyEdited && validQty && validUnitCost
              ? "Auto-filled from quantity × unit cost"
              : undefined
          }
          className="grow"
        >
          {({ id, "aria-describedby": describedBy }) => (
            <div className={fieldBox}>
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                KES
              </span>
              <input
                id={id}
                aria-describedby={describedBy}
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  setCostManuallyEdited(true);
                }}
                inputMode="decimal"
                placeholder="0.00"
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
              />
            </div>
          )}
        </FormField>
      </div>

      <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
        Unit cost updates this product's catalog buying price.
      </div>

      <SegmentedControl
        label="Paid From"
        options={[...PAID_FROM_LABELS]}
        value={PAID_FROM_LABEL[paidFrom]}
        onChange={(label) => setPaidFrom(PAID_FROM_KEY[label])}
      />

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        {matchReceipt
          ? "This links the payment to the delivery already received — it won't be prompted for receiving again."
          : "If this delivery hasn't been received yet, it will show as awaiting receipt until the Store Manager or Canteen Attendant matches and receives it."}
      </div>
    </Drawer>
  );
}
