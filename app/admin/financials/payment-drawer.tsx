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
import { stockApi, StockRequestError } from "../stock/use-stock";

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
}: {
  products: ProductWithLocations[];
  locations: Location[];
  onClose: () => void;
  onRecorded: () => void | Promise<void>;
  /** Reconciliation "Record payment" action pre-selects the delivered product. */
  preselectedProductId?: string;
}) {
  const { toast } = useToast();
  // The payment-drawer product picker only ever offers `ingredient` + `goods`
  // — a Dish is never purchased from a supplier (its cost is derived from
  // ingredients, ADR-33). ADR-46 §6.
  const purchasableProducts = React.useMemo(
    () => products.filter((p) => p.kind !== "dish"),
    [products],
  );
  const [supplier, setSupplier] = React.useState("");
  const [productId, setProductId] = React.useState(preselectedProductId ?? "");
  const [locationId, setLocationId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [cost, setCost] = React.useState("");
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

  const validQty = /^\d+(\.\d{1,4})?$/.test(quantity.trim());
  const validCost = /^\d+(\.\d{1,2})?$/.test(cost.trim());
  const canSubmit =
    supplier.trim() !== "" &&
    productId !== "" &&
    locationId !== "" &&
    validQty &&
    validCost &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await stockApi.recordPurchasePayment({
        productId,
        locationId,
        supplier: supplier.trim(),
        quantity: quantity.trim(),
        cost: cost.trim(),
        paidFromAccount: paidFrom,
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
            Disburse &amp; Register Delivery
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <FormField label="Supplier / Vendor" required className="w-full">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Farmer's Choice Butchery"
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <div className="flex flex-col gap-(--sp-2) w-full">
        <Select
          label="Product"
          required
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
                inputMode="decimal"
                placeholder="0.0"
                className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
              />
              <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                {product?.unitLabel ?? "unit"}
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

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        The Store Manager receives this delivery on mobile with 1-tap
        matching. (The cash-balance debit lands in Milestone 3.)
      </div>
    </Drawer>
  );
}
