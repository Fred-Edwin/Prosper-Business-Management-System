"use client";

// M5 v2 Session C — the "Record Non-Sale Use" drawer for the Financials
// Non-Sale Consumption tab. Composed from the kit rail <Drawer> + <Select>
// + <FormField> + <SegmentedControl> + <Button>, following
// expense-drawer.tsx exactly.
//
// Pure wiring — the write endpoint already exists from M1: POST
// /api/stock-movements/non-sale/batch (recordNonSaleConsumptionBatch).
// The batch body is `{ locationId, reason, note?, lines: [{ productId,
// quantity }] }` — one reason for the whole batch, `note` only meaningful
// when reason is "other". This Admin drawer records ONE line (a single
// product + quantity); the staff-side multi-row picker
// (<MovementPickerFlow>) is the flow that needs the batch's plural shape.
//
// §3.8 BLOCK — a quantity over the derived balance rejects server-side
// (VALIDATION_ERROR on field "lines"); that message is surfaced as-is
// rather than pre-validated here, so the ledger stays the one authority.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select } from "@/components/kit/select";
import { useToast } from "@/components/kit/toast";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { NonSaleReason } from "@/lib/domain/stock";

const REASON_OPTIONS = [
  { value: "spoiled", label: "Spoiled" },
  { value: "staff_meal", label: "Staff meal" },
  { value: "complimentary", label: "Complimentary" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other" },
] as const;

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "Check the fields and try again.",
  FORBIDDEN: "You can't record non-sale use at that location.",
  NOT_FOUND: "That product or location no longer exists.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const fieldBox =
  "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-field";

const validQty = (v: string) => /^\d+(\.\d{1,4})?$/.test(v.trim()) && Number(v) > 0;

export function NonSaleDrawer({
  products,
  locations,
  onClose,
  onCreated,
}: {
  products: ProductWithLocations[];
  locations: Location[];
  onClose: () => void;
  /** Called after a successful write so the tab + summary refresh. */
  onCreated: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [locationId, setLocationId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState<NonSaleReason | "">("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const locationOptions = React.useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );

  /** Only products actually assigned to the chosen location can be written off. */
  const productOptions = React.useMemo(
    () =>
      products
        .filter((p) => p.deletedAt == null)
        .filter(
          (p) =>
            locationId === "" ||
            p.locations.some((l) => l.locationId === locationId && l.active),
        )
        .map((p) => ({ value: p.id, label: p.name })),
    [products, locationId],
  );

  // Changing location can orphan the chosen product — clear it rather than
  // silently posting a product that isn't stocked there.
  React.useEffect(() => {
    if (productId && !productOptions.some((o) => o.value === productId)) {
      setProductId("");
    }
  }, [productOptions, productId]);

  const canSubmit =
    locationId !== "" &&
    productId !== "" &&
    validQty(quantity) &&
    reason !== "" &&
    (reason !== "other" || note.trim() !== "") &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/stock-movements/non-sale/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          reason,
          note: note.trim() !== "" ? note.trim() : undefined,
          lines: [{ productId, quantity: quantity.trim() }],
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { data: unknown }
        | { error: { code: string; message: string } }
        | null;
      if (!res.ok || !body || "error" in body) {
        const err =
          body && "error" in body
            ? body.error
            : { code: "INTERNAL_ERROR", message: "Request failed." };
        // A §3.8 over-balance rejection carries a specific, useful
        // message — prefer it over the generic code mapping.
        setError(err.message || CODE_MESSAGE[err.code] || "Something went wrong.");
        return;
      }
      toast("Non-sale use recorded", { tone: "success" });
      await onCreated();
      onClose();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Record Non-Sale Use"
      subtitle="Spoilage, staff meals & complimentary items"
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
            Record Non-Sale Use
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <Select
        label="Location"
        required
        className="w-full"
        placeholder="Select a location…"
        value={locationId}
        onChange={setLocationId}
        options={locationOptions}
      />

      <Select
        label="Product"
        required
        className="w-full"
        placeholder={
          locationId === "" ? "Choose a location first…" : "Select a product…"
        }
        disabled={locationId === ""}
        value={productId}
        onChange={setProductId}
        options={productOptions}
      />

      <FormField label="Quantity" required className="w-full">
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none text-right placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <Select
        label="Reason"
        required
        className="w-full"
        placeholder="Why did this leave stock?"
        value={reason}
        onChange={(v) => setReason(v as NonSaleReason)}
        options={[...REASON_OPTIONS]}
      />

      <FormField
        label="Note"
        required={reason === "other"}
        className="w-full"
      >
        {({ id, "aria-describedby": describedBy }) => (
          <div className={fieldBox}>
            <input
              id={id}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                reason === "other"
                  ? "Required — what happened?"
                  : "Optional — any detail"
              }
              className="font-ui [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none placeholder:[color:var(--text-tertiary)]"
            />
          </div>
        )}
      </FormField>

      <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
        This removes the stock immediately. It does not reduce Net Profit —
        the cost is already inside COGS (ADR-55); this is a
        management-visibility estimate.
      </div>
    </Drawer>
  );
}
