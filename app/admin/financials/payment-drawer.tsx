// Wired from docs/design/screens/admin-financials-payment-drawer-open/page.tsx
// (Paper artboard 85W-0, the docked 420px right rail). Panel markup — kit
// <Drawer variant="rail">, the field rows, the "Paid From" segmented choice,
// the info note, the two footer <Button>s — follows the skeleton. This file
// adds the real form state and the POST /api/stock-movements
// { movementType: "purchase_payment", … } call.
//
// F2 scope: recordPurchasePayment writes a purchase_payment row (quantity 0,
// no stock effect — ADR-39); the MoneyMovement debit is F3.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import { stockApi, StockRequestError } from "../stock/use-stock";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  FORBIDDEN: "Only an administrator can record a purchase payment.",
  NOT_FOUND: "That product or location no longer exists.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

export function PaymentDrawer({
  products,
  locations,
  onClose,
  onRecorded,
}: {
  products: ProductWithLocations[];
  locations: Location[];
  onClose: () => void;
  onRecorded: () => void | Promise<void>;
}) {
  const [supplier, setSupplier] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [paidFrom, setPaidFrom] = React.useState<"cash" | "mpesa_bank">("cash");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const product = products.find((p) => p.id === productId);
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
    "flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]";
  const labelCls =
    "font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-body/sm";

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
        <div className="font-ui text-danger text-body/sm">{error}</div>
      )}

      <div className="flex flex-col gap-(--sp-3)">
        <span className={labelCls}>Supplier / Vendor *</span>
        <div className={fieldBox}>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. Farmer's Choice Butchery"
            className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-(--sp-3)">
        <span className={labelCls}>Product *</span>
        <div className={fieldBox}>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unitLabel})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-(--sp-3)">
        <span className={labelCls}>Destination *</span>
        <div className={fieldBox}>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
          >
            <option value="">Select a location…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-(--sp-4)">
        <div className="flex flex-col grow gap-(--sp-3)">
          <span className={labelCls}>Quantity *</span>
          <div className={fieldBox}>
            <input
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
        </div>
        <div className="flex flex-col grow gap-(--sp-3)">
          <span className={labelCls}>Total Cost *</span>
          <div className={fieldBox}>
            <span className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
              KES
            </span>
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-(--sp-3)">
        <span className={labelCls}>Paid From *</span>
        <div className="flex items-center gap-(--sp-3)">
          {(
            [
              ["cash", "Cash at Hand"],
              ["mpesa_bank", "M-Pesa / Bank Till"],
            ] as const
          ).map(([key, label]) => {
            const active = paidFrom === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPaidFrom(key)}
                className={`flex items-center justify-center h-[36px] grow px-(--sp-5) rounded-sm border border-solid kit-focus-ring ${
                  active
                    ? "border-accent bg-(--surface-selected)"
                    : "[border-color:var(--border-strong)] bg-(--surface-page)"
                }`}
              >
                <span
                  className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-body/sm ${
                    active ? "text-accent" : "[color:var(--text-primary)]"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        The Store Manager receives this delivery on mobile with 1-tap
        matching. (The cash-balance debit lands in Milestone 3.)
      </div>
    </Drawer>
  );
}
