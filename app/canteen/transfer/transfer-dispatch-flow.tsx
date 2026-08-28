"use client";

// Canteen — Transfer Dispatch flow (Canteen → Store/Restaurant, phase 1).
// Session 12, ADR-44 — composed from the kit; artboard 9FE-0 superseded.
// Mirror of the Store Manager transfer flow, Canteen-scoped.
//
// Composition: product <Select> + <QuantityStepper> (unsigned magnitude) +
// destination <Select> + <CalculatedImpactBanner> + sticky submit → POST
// /api/stock-movements { movementType: "transfer" } (the −q dispatch row;
// the receiver accepts via the pinned banner on their hub) → <Toast>.

import * as React from "react";
import { Select } from "@/components/kit/select";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import { useStaffStock, stockApi } from "@/app/store-manager/use-staff-stock";
import { trimQty } from "@/app/store-manager/staff-stock-format";
import { FlowScaffold } from "@/app/store-manager/flows/flow-scaffold";

export function TransferDispatchFlow() {
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();

  const [productId, setProductId] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [destId, setDestId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const canteenLocationId =
    data.locations.find((l) => l.type === "canteen")?.id ?? "";
  const destinations = data.locations.filter((l) => l.id !== canteenLocationId);
  const products = data.products;
  const selected = products.find((p) => p.id === productId);
  const unit = selected?.unitLabel ?? "";
  const qtyValid = qty > 0;
  const canSubmit =
    productId !== "" && qtyValid && destId !== "" && canteenLocationId !== "";
  const destName = destinations.find((d) => d.id === destId)?.name;

  async function onSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const magnitude = String(qty);
      await stockApi.dispatchTransfer({
        productId,
        fromLocationId: canteenLocationId,
        toLocationId: destId,
        quantity: magnitude,
      });
      toast(
        `Dispatched ${trimQty(magnitude)} ${unit} ${selected?.name} to ${destName ?? "destination"} — awaiting their accept`,
        { tone: "success" },
      );
      setProductId("");
      setQty(1);
      setDestId("");
      setTouched(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't dispatch the transfer.", {
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <FlowScaffold
        title="Transfer Stock"
        direction="Canteen → …"
        directionTone="info"
        submitLabel="Transfer Stock"
        submitDisabled
        onSubmit={() => {}}
      >
        <ErrorState description={error} onRetry={refresh} />
      </FlowScaffold>
    );
  }

  return (
    <FlowScaffold
      title="Transfer Stock"
      direction={`Canteen → ${destName ?? "…"}`}
      directionTone="info"
      submitLabel={
        selected && qtyValid
          ? `Dispatch (−${trimQty(String(qty))} ${unit})`
          : "Transfer Stock"
      }
      submitDisabled={loading}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <Select
        label="Product"
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
        label="Transfer quantity"
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

      <Select
        label="Destination"
        required
        placeholder="Send to…"
        options={destinations.map((d) => ({ value: d.id, label: d.name }))}
        value={destId}
        onChange={setDestId}
        error={touched && destId === ""}
        helperText={touched && destId === "" ? "Pick a destination." : undefined}
        className="w-full"
      />

      {selected && qtyValid && (
        <CalculatedImpactBanner>
          {`Removes ${trimQty(String(qty))} ${unit} of ${selected.name} from Canteen now; it lands at ${destName ?? "the destination"} once they accept.`}
        </CalculatedImpactBanner>
      )}
    </FlowScaffold>
  );
}
