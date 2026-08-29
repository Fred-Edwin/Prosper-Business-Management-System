"use client";

// Store Manager — Transfer Stock / Log Non-Sale flow (Session 12, ADR-44
// — composed from the kit; artboard 92M-0 superseded).
//
//   mode="transfer"  → <FlowHeader directionTone="info">, origin (Store) →
//                      destination <Select>, POST { movementType:"transfer" }
//                      (phase 1 — the −q dispatch row only; the receiver
//                      accepts via the pinned banner on their hub).
//   mode="non-sale"  → <FlowHeader directionTone="warning">, reason <Select>
//                      + optional note <Textarea> (required iff reason
//                      "other"), POST { movementType:"non_sale_consumption" }.
//
// Composition: product <Select> + <QuantityStepper> (unsigned magnitude) +
// destination/reason <Select> + note <Textarea> + <CalculatedImpactBanner>
// + sticky submit → <Toast> + reset.

import * as React from "react";
import type { NonSaleReason } from "@/lib/domain/stock";
import { Select } from "@/components/kit/select";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { Textarea } from "@/components/kit/textarea";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import { useStaffStock, stockApi } from "../use-staff-stock";
import { trimQty } from "../staff-stock-format";
import { FlowScaffold } from "./flow-scaffold";

type Mode = "transfer" | "non-sale";

const NON_SALE_REASONS: { value: NonSaleReason; label: string }[] = [
  { value: "staff_meal", label: "Staff meal / tea" },
  { value: "complimentary", label: "Complimentary" },
  { value: "spoiled", label: "Spoiled" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other (note required)" },
];

export function TransferNonSaleFlow({ mode }: { mode: Mode }) {
  const isTransfer = mode === "transfer";
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();

  const [productId, setProductId] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [destId, setDestId] = React.useState("");
  const [reason, setReason] = React.useState<NonSaleReason | "">("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const storeLocationId =
    data.locations.find((l) => l.type === "store")?.id ?? "";
  // Transfer destinations: any location that isn't the Store.
  const destinations = data.locations.filter((l) => l.id !== storeLocationId);
  // Goods & sodas move on a transfer; non-sale can be any stocked product.
  const products = data.products;

  const selected = products.find((p) => p.id === productId);
  const unit = selected?.unitLabel ?? "";
  const qtyValid = qty > 0;
  const noteRequired = mode === "non-sale" && reason === "other";
  const noteValid = !noteRequired || note.trim() !== "";
  const secondaryValid = isTransfer ? destId !== "" : reason !== "";
  const canSubmit =
    productId !== "" &&
    qtyValid &&
    secondaryValid &&
    noteValid &&
    (!isTransfer || storeLocationId !== "");

  async function onSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const magnitude = String(qty);
      if (isTransfer) {
        await stockApi.dispatchTransfer({
          productId,
          fromLocationId: storeLocationId,
          toLocationId: destId,
          quantity: magnitude,
        });
        const destName = destinations.find((d) => d.id === destId)?.name ?? "destination";
        toast(
          `Dispatched ${trimQty(magnitude)} ${unit} ${selected?.name} to ${destName} — awaiting their accept`,
          { tone: "success" },
        );
      } else {
        await stockApi.recordNonSale({
          productId,
          locationId: storeLocationId,
          quantity: magnitude,
          reason: reason as NonSaleReason,
          reasonNote: note,
        });
        toast(
          `Logged ${trimQty(magnitude)} ${unit} ${selected?.name} as non-sale`,
          { tone: "success" },
        );
      }
      setProductId("");
      setQty(1);
      setDestId("");
      setReason("");
      setNote("");
      setTouched(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't record the movement.", {
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const title = isTransfer ? "Transfer Stock" : "Log Non-Sale";

  if (error) {
    return (
      <FlowScaffold
        title={title}
        direction={isTransfer ? "Store → …" : "Staff meals & spoilage"}
        directionTone={isTransfer ? "info" : "warning"}
        submitLabel={title}
        submitDisabled
        onSubmit={() => {}}
      >
        <ErrorState description={error} onRetry={refresh} />
      </FlowScaffold>
    );
  }

  const destName = destinations.find((d) => d.id === destId)?.name;

  return (
    <FlowScaffold
      title={title}
      direction={
        isTransfer
          ? `Store → ${destName ?? "…"}`
          : "Staff meals & spoilage"
      }
      directionTone={isTransfer ? "info" : "warning"}
      submitLabel={
        selected && qtyValid
          ? `${isTransfer ? "Dispatch" : "Log"} (−${trimQty(String(qty))} ${unit})`
          : title
      }
      // Submit stays enabled while the form is incomplete — clicking it
      // marks the fields touched and surfaces the per-field errors (§9.8),
      // rather than a dead button with no explanation. Only a load/in-flight
      // state blocks it.
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
        label={isTransfer ? "Transfer quantity" : "Quantity consumed"}
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

      {isTransfer ? (
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
      ) : (
        <>
          <Select
            label="Consumption reason"
            required
            placeholder="Why is this stock leaving?"
            options={NON_SALE_REASONS}
            value={reason}
            onChange={(v) => setReason(v as NonSaleReason)}
            error={touched && reason === ""}
            helperText={touched && reason === "" ? "Pick a reason." : undefined}
            className="w-full"
          />
          <Textarea
            label={noteRequired ? "Note (required)" : "Note (optional)"}
            required={noteRequired}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={touched && !noteValid}
            helperText={
              touched && !noteValid ? "A note is required for 'Other'." : undefined
            }
            className="w-full"
          />
        </>
      )}

      {selected && qtyValid && (
        <CalculatedImpactBanner>
          {isTransfer
            ? `Removes ${trimQty(String(qty))} ${unit} of ${selected.name} from Store now; it lands at ${destName ?? "the destination"} once they accept.`
            : `Removes ${trimQty(String(qty))} ${unit} of ${selected.name} from Store stock now.`}
        </CalculatedImpactBanner>
      )}
    </FlowScaffold>
  );
}
