// Admin Stock Ledger blank-cell "record new entry" flow (client request,
// 2026-09-17). Sibling to <CorrectionDrawer> in correction-drawer.tsx —
// same kit composition (Drawer + FormField + Textarea + Button + Toast) —
// but for a cell with NO existing movement behind it: there's nothing to
// correct, so this writes a brand-new row instead, dated to the ledger's
// selected business day. On an already-closed day, only the Admin backfill
// path this drawer calls is allowed through; every other create path in
// the app still hard-blocks a closed day.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { FormField } from "@/components/kit/form-field";
import { Select, type SelectOption } from "@/components/kit/select";
import { Textarea } from "@/components/kit/textarea";
import { useToast } from "@/components/kit/toast";
import type { Location } from "@/lib/domain/catalog";
import { stockApi, StockRequestError } from "./use-stock";

const REASON_OPTIONS: SelectOption[] = [
  { value: "staff_meal", label: "Staff meal" },
  { value: "complimentary", label: "Complimentary" },
  { value: "spoiled", label: "Spoiled" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other" },
];

/** The blank column a ledger cell maps to — what kind of row to create. */
export type RecordEntryKind =
  | "purchases"
  | "issues"
  | "nonSale"
  | "production"
  | "transferIn"
  | "transferOut"
  | "opening";

/** What the ledger hands the drawer when a blank cell is clicked. */
export type RecordEntryTarget = {
  kind: RecordEntryKind;
  productId: string;
  locationId: string;
  /** The OTHER location, for a Transfer In/Out cell — required to write the pair. */
  counterpartLocationId?: string;
  businessDate: string;
  /** e.g. "Store · Beef Fillet (kg) · Aug 24" — the drawer's context subtitle. */
  subtitle: string;
  fieldLabel: string;
  unit: string;
  locations: Location[];
};

const CODE_MESSAGE: Record<string, string> = {
  FORBIDDEN:
    "This day is closed, or you're not permitted to record this entry.",
  NOT_FOUND: "That product or location no longer exists — reload the ledger.",
  VALIDATION_ERROR: "Check the quantity and try again.",
  CONFLICT: "This entry was changed elsewhere — reload the ledger.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

function fmt1(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

export function RecordEntryDrawer({
  target,
  onClose,
  onRecorded,
}: {
  target: RecordEntryTarget;
  onClose: () => void;
  onRecorded: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [quantityRaw, setQuantityRaw] = React.useState("");
  const [reason, setReason] = React.useState("staff_meal");
  const [reasonNote, setReasonNote] = React.useState("");
  const [counterpartLocationId, setCounterpartLocationId] = React.useState(
    target.counterpartLocationId ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const validNumber = /^\d+(\.\d{1,4})?$/.test(quantityRaw.trim());
  const quantity = Number(quantityRaw);
  const isZero = validNumber && quantity === 0;
  const isNonSale = target.kind === "nonSale";
  const isTransfer = target.kind === "transferIn" || target.kind === "transferOut";
  const reasonNoteRequired = isNonSale && reason === "other";
  const reasonNoteInvalid = reasonNoteRequired && reasonNote.trim().length === 0;
  const transferLocationInvalid = isTransfer && !counterpartLocationId;

  const fieldInvalid =
    !validNumber || isZero || reasonNoteInvalid || transferLocationInvalid;

  const locationOptions: SelectOption[] = target.locations
    .filter((l) => l.id !== target.locationId)
    .map((l) => ({ value: l.id, label: l.name }));

  async function submit() {
    if (fieldInvalid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      switch (target.kind) {
        case "purchases":
          await stockApi.recordPurchaseReceipt({
            productId: target.productId,
            locationId: target.locationId,
            quantity: quantityRaw.trim(),
            businessDate: target.businessDate,
          });
          break;
        case "issues":
          await stockApi.recordKitchenIssue({
            productId: target.productId,
            locationId: target.locationId,
            quantity: quantityRaw.trim(),
            businessDate: target.businessDate,
          });
          break;
        case "production":
          await stockApi.recordProduction({
            productId: target.productId,
            locationId: target.locationId,
            quantity: quantityRaw.trim(),
            businessDate: target.businessDate,
          });
          break;
        case "nonSale":
          await stockApi.recordNonSaleConsumption({
            productId: target.productId,
            locationId: target.locationId,
            quantity: quantityRaw.trim(),
            reason: reason as
              | "staff_meal"
              | "complimentary"
              | "spoiled"
              | "damaged"
              | "other",
            reasonNote: reasonNoteRequired ? reasonNote.trim() : undefined,
            businessDate: target.businessDate,
          });
          break;
        case "transferIn":
          await stockApi.recordCompletedTransfer({
            productId: target.productId,
            fromLocationId: counterpartLocationId,
            toLocationId: target.locationId,
            quantity: quantityRaw.trim(),
            businessDate: target.businessDate,
          });
          break;
        case "transferOut":
          await stockApi.recordCompletedTransfer({
            productId: target.productId,
            fromLocationId: target.locationId,
            toLocationId: counterpartLocationId,
            quantity: quantityRaw.trim(),
            businessDate: target.businessDate,
          });
          break;
        case "opening":
          await stockApi.setOpeningStock({
            productId: target.productId,
            locationId: target.locationId,
            businessDate: target.businessDate,
            quantity: quantityRaw.trim(),
          });
          break;
      }
      await onRecorded();
      toast("Entry recorded", { tone: "success" });
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

  const impact = !validNumber
    ? "Enter a quantity to preview the impact."
    : isZero
      ? "Enter a non-zero quantity."
      : `Recording ${fmt1(quantity)}${target.unit} of ${target.fieldLabel} on this day. The Closing figure updates to the derived value on save.`;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Record New Entry"
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
            disabled={fieldInvalid || submitting}
            loading={submitting}
          >
            Save Entry
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      {isTransfer && (
        <Select
          label={target.kind === "transferIn" ? "From location" : "To location"}
          options={locationOptions}
          value={counterpartLocationId}
          onChange={setCounterpartLocationId}
          placeholder="Select a location"
          error={transferLocationInvalid}
          helperText={transferLocationInvalid ? "Pick the other location." : undefined}
        />
      )}

      <FormField
        label={target.fieldLabel}
        required
        error={
          fieldInvalid && !reasonNoteInvalid && !transferLocationInvalid
            ? isZero
              ? "Enter a non-zero quantity."
              : "Enter a valid number (up to 4 decimal places)."
            : undefined
        }
        hint={
          target.kind === "opening"
            ? "Sets or corrects the opening on-hand quantity for this product/location."
            : "Nothing recorded for this cell yet."
        }
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
              value={quantityRaw}
              onChange={(e) => setQuantityRaw(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              className="font-mono [color:var(--text-primary)] text-body/sm w-full bg-transparent outline-none"
            />
            <div className="font-ui shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              {target.unit}
            </div>
          </div>
        )}
      </FormField>

      {isNonSale && (
        <>
          <Select
            label="Reason"
            options={REASON_OPTIONS}
            value={reason}
            onChange={setReason}
          />
          {reason === "other" && (
            <Textarea
              label="Note"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="What happened?"
              error={reasonNoteInvalid}
              helperText={reasonNoteInvalid ? "A note is required for “Other”." : undefined}
              className="w-full"
            />
          )}
        </>
      )}

      <CalculatedImpactBanner>{impact}</CalculatedImpactBanner>
    </Drawer>
  );
}
