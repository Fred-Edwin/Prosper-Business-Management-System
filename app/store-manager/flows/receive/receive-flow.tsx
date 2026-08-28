"use client";

// Store Manager — Receive Goods flow (Session 12, ADR-44). Composed from
// the kit: product <Select> + <QuantityStepper> (unsigned magnitude) +
// <CalculatedImpactBanner> + sticky submit → <Toast> + reset. Wired to
// POST /api/stock-movements { movementType: "purchase_receipt" }.
//
// TODO(mock): the "match a payment the Admin already made" path
// (purchasePaymentId link + <MatchCard>) has no staff-facing source —
// GET /api/stock-movements/outstanding is Admin-only. When a staff-scoped
// "deliveries awaiting receipt" read lands, add the MatchCard list above
// the manual form; stockApi.recordPurchaseReceipt already takes the
// optional purchasePaymentId.

import * as React from "react";
import { Select } from "@/components/kit/select";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import { useStaffStock, stockApi } from "../../use-staff-stock";
import { trimQty } from "../../staff-stock-format";
import { FlowScaffold } from "../flow-scaffold";

export function ReceiveFlow() {
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();

  const [productId, setProductId] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const storeLocationId =
    data.locations.find((l) => l.type === "store")?.id ?? "";
  // Deliveries are ingredients + goods (dishes are produced, not delivered).
  const products = data.products.filter((p) => p.kind !== "dish");
  const selected = products.find((p) => p.id === productId);
  const unit = selected?.unitLabel ?? "";
  const qtyValid = qty > 0;
  const canSubmit = productId !== "" && qtyValid && storeLocationId !== "";

  async function onSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const magnitude = String(qty);
      await stockApi.recordPurchaseReceipt({
        productId,
        locationId: storeLocationId,
        quantity: magnitude,
      });
      toast(`Received ${trimQty(magnitude)} ${unit} ${selected?.name}`, {
        tone: "success",
      });
      setProductId("");
      setQty(1);
      setTouched(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't record the delivery.", {
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <FlowScaffold
        title="Receive Goods"
        direction="Supplier → Store"
        directionTone="success"
        submitLabel="Receive Goods"
        submitDisabled
        onSubmit={() => {}}
      >
        <ErrorState description={error} onRetry={refresh} />
      </FlowScaffold>
    );
  }

  return (
    <FlowScaffold
      title="Receive Goods"
      direction="Supplier → Store"
      directionTone="success"
      submitLabel={
        selected && qtyValid
          ? `Receive (+${trimQty(String(qty))} ${unit})`
          : "Receive Goods"
      }
      // Submit stays enabled while incomplete — clicking marks fields
      // touched and surfaces the §9.8 errors; only load blocks it.
      submitDisabled={loading}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <Select
        label="Product delivered"
        required
        placeholder={loading ? "Loading…" : "Select a product…"}
        options={products.map((p) => ({ value: p.id, label: p.name }))}
        value={productId}
        onChange={setProductId}
        error={touched && productId === ""}
        helperText={touched && productId === "" ? "Pick a product." : undefined}
        className="w-full"
      />

      <QuantityStepper
        label="Quantity received"
        required
        value={qty}
        unit={unit || undefined}
        min={0}
        step={1}
        onChange={setQty}
        error={touched && !qtyValid}
        helperText={touched && !qtyValid ? "Enter a quantity above zero." : undefined}
        className="w-full"
      />

      {selected && qtyValid && (
        <CalculatedImpactBanner>
          {`Adds ${trimQty(String(qty))} ${unit} of ${selected.name} to Store stock now.`}
        </CalculatedImpactBanner>
      )}
    </FlowScaffold>
  );
}
