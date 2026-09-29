// Owner sale adjustment (Admin, ADR-92) — sibling of
// balance-correction-drawer.tsx, scoped to one product/location/day's Sold
// TOTAL. The drawer submits the CORRECTED FINAL Sold figure; the server
// computes the delta and writes stock + revenue together. Never send a
// delta. The revenue shown here is a preview; the server prices it.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import { stockApi, StockRequestError } from "./use-stock";

/** What the ledger hands the drawer when a Sold cell is clicked. */
export type SaleAdjustmentTarget = {
  productId: string;
  locationId: string;
  /** `YYYY-MM-DD` — the day whose Sold total is being restated. */
  businessDate: string;
  /** The day's current Sold total, as a positive magnitude (e.g. "8"). */
  currentSold: string;
  /** The product's selling price at this location, or null if it has none. */
  sellingPrice: string | null;
  /** e.g. "Canteen · Soda 300ml (pcs) · Sep 19" — the drawer's subtitle. */
  subtitle: string;
  /** Unit label, e.g. "pcs". */
  unit: string;
};

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN: "Only an administrator can adjust a sold figure.",
  NOT_FOUND: "That product or location no longer exists — reload the ledger.",
  CONFLICT: "This figure was changed elsewhere — reload the ledger.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

function fmt1(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function kes(n: number): string {
  return `KES ${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function SaleAdjustmentDrawer({
  target,
  onClose,
  onAdjusted,
}: {
  target: SaleAdjustmentTarget;
  onClose: () => void;
  /** Called after a successful adjustment so the caller can refetch. */
  onAdjusted: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const current = Number(target.currentSold);
  const price = target.sellingPrice != null ? Number(target.sellingPrice) : null;
  const [correctedRaw, setCorrectedRaw] = React.useState(fmt1(current));
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const corrected = Number(correctedRaw);
  const validNumber = /^\d+(\.\d{1,4})?$/.test(correctedRaw.trim());
  const delta = validNumber ? corrected - current : NaN;
  const unchanged = validNumber && Math.abs(delta) < 1e-9;
  const canSubmit = validNumber && !unchanged && price != null && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await stockApi.adjustSold({
        productId: target.productId,
        locationId: target.locationId,
        businessDate: target.businessDate,
        correctedSold: correctedRaw.trim(),
        note: note.trim() || undefined,
      });
      await onAdjusted();
      toast("Sold figure adjusted", { tone: "success" });
      onClose();
    } catch (e) {
      if (e instanceof StockRequestError) {
        setError(CODE_MESSAGE[e.code] ?? e.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const impact =
    price == null
      ? "This product has no selling price at this location, so a sale can't be valued. Set one in Catalog first."
      : !validNumber
        ? "Enter the correct sold figure to preview the impact."
        : unchanged
          ? "The figure matches the current one — nothing to save."
          : `Sold goes from ${fmt1(current)} to ${fmt1(corrected)} ${target.unit} (${
              delta > 0 ? "+" : ""
            }${delta.toFixed(2)}). Closing stock ${delta > 0 ? "falls" : "rises"} by ${fmt1(
              Math.abs(delta),
            )} ${target.unit}, and ${kes(delta * price)} is ${
              delta > 0 ? "added to" : "taken off"
            } revenue and Cash for this day.`;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Adjust Sold"
      subtitle={target.subtitle}
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button
            variant="primary"
            className="grow"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting}
          >
            Confirm &amp; Save Adjustment
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui [color:var(--text-secondary)] text-body/sm">
          Sold this day
        </div>
        <div className="font-mono text-body/sm [color:var(--text-primary)]">
          {fmt1(current)} {target.unit}
        </div>
      </div>
      <div className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui [color:var(--text-secondary)] text-body/sm">
          Selling price
        </div>
        <div className="font-mono text-body/sm [color:var(--text-primary)]">
          {price != null ? `${kes(price)} / ${target.unit}` : "—"}
        </div>
      </div>

      <FormField
        label="Correct sold figure"
        required
        error={
          correctedRaw.trim().length > 0 && (!validNumber || unchanged)
            ? unchanged
              ? "The figure matches the current one."
              : "Enter a valid number (0 or more, up to 4 decimal places)."
            : undefined
        }
        hint={`Current: ${fmt1(current)} ${target.unit}`}
        className="w-full"
      >
        {({ id, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
          <div
            className={`flex items-center justify-between h-(--control-md) px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid kit-field ${
              invalid ? "border-danger" : "[border-color:var(--border-strong)]"
            }`}
            data-invalid={invalid || undefined}
          >
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={correctedRaw}
              onChange={(e) => setCorrectedRaw(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
            />
            <div className="font-ui shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              {target.unit}
            </div>
          </div>
        )}
      </FormField>

      <CalculatedImpactBanner>{impact}</CalculatedImpactBanner>

      <Textarea
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. staff forgot to record 5 sodas"
        className="w-full"
      />
    </Drawer>
  );
}
