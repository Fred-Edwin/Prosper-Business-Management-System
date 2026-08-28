"use client";

// Store Manager — Issue Ingredients / Record Production flow (Session 12,
// ADR-44 — composed from the kit; artboard 8XH-0 superseded).
//
//   mode="issue"      → <FlowHeader directionTone="danger">, Store → Kitchen,
//                       any ingredient/goods product, POST { movementType:"issue" }
//   mode="production"  → <FlowHeader directionTone="success">, Kitchen → Restaurant,
//                       a kind="dish" product into a restaurant location,
//                       POST { movementType:"production" }
//
// Composition: <Select> (product) + <QuantityStepper> (unsigned magnitude)
// + <CalculatedImpactBanner> (impact preview) + sticky submit → <Toast>
// on success + reset. The client sends the unsigned magnitude only; the
// domain applies the sign (ADR-39).

import * as React from "react";
import { Select } from "@/components/kit/select";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import { useStaffStock, stockApi } from "../use-staff-stock";
import { trimQty } from "../staff-stock-format";
import { FlowScaffold } from "./flow-scaffold";

type Mode = "issue" | "production";

const COPY: Record<
  Mode,
  {
    title: string;
    direction: string;
    tone: "danger" | "success";
    productLabel: string;
    verb: string;
  }
> = {
  issue: {
    title: "Issue Ingredients",
    direction: "Store → Kitchen",
    tone: "danger",
    productLabel: "Ingredient to issue",
    verb: "Issue",
  },
  production: {
    title: "Record Production",
    direction: "Kitchen → Restaurant",
    tone: "success",
    productLabel: "Cooked dish",
    verb: "Produce",
  },
};

export function IssueProductionFlow({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();

  const [productId, setProductId] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  // issue: ingredients + goods held at the Store. production: dishes only.
  const products = data.products.filter((p) =>
    mode === "production" ? p.kind === "dish" : p.kind !== "dish",
  );
  const storeLocationId =
    data.locations.find((l) => l.type === "store")?.id ?? "";
  const restaurantLocationId =
    data.locations.find((l) => l.type === "restaurant")?.id ?? "";
  const targetLocationId =
    mode === "production" ? restaurantLocationId : storeLocationId;

  const selected = products.find((p) => p.id === productId);
  const unit = selected?.unitLabel ?? "";
  const qtyValid = qty > 0;
  const canSubmit = productId !== "" && qtyValid && targetLocationId !== "";

  async function onSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const magnitude = String(qty);
      if (mode === "issue") {
        await stockApi.recordIssue({
          productId,
          locationId: storeLocationId,
          quantity: magnitude,
        });
      } else {
        await stockApi.recordProduction({
          productId,
          locationId: restaurantLocationId,
          quantity: magnitude,
        });
      }
      toast(
        mode === "issue"
          ? `Issued ${trimQty(magnitude)} ${unit} ${selected?.name} to the kitchen`
          : `Logged ${trimQty(magnitude)} ${unit} ${selected?.name}`,
        { tone: "success" },
      );
      setProductId("");
      setQty(1);
      setTouched(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : `Couldn't ${copy.verb.toLowerCase()} the stock.`, {
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <FlowScaffold
        title={copy.title}
        direction={copy.direction}
        directionTone={copy.tone}
        submitLabel={copy.title}
        submitDisabled
        onSubmit={() => {}}
      >
        <ErrorState description={error} onRetry={refresh} />
      </FlowScaffold>
    );
  }

  return (
    <FlowScaffold
      title={copy.title}
      direction={copy.direction}
      directionTone={copy.tone}
      submitLabel={
        selected && qtyValid
          ? `${copy.title} (${mode === "issue" ? "−" : "+"}${trimQty(String(qty))} ${unit})`
          : copy.title
      }
      // Submit stays enabled while incomplete — clicking marks fields
      // touched and surfaces the §9.8 errors; only load blocks it.
      submitDisabled={loading}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <Select
        label={copy.productLabel}
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
        label="Quantity"
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
          {mode === "issue"
            ? `Removes ${trimQty(String(qty))} ${unit} of ${selected.name} from Store stock now.`
            : `Adds ${trimQty(String(qty))} ${unit} of ${selected.name} to Restaurant stock now.`}
        </CalculatedImpactBanner>
      )}
    </FlowScaffold>
  );
}
