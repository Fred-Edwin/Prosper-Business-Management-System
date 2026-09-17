"use client";

// Void a `purchase_receipt` (ADR-15 — a correction to zero, the delivery
// side sibling of purchase-payment-correction-drawer.tsx's "Void this
// payment"). Confirm-only: no corrected-value form, because a receipt
// carries no money — reversing its quantity to zero is the whole action.
//
// This is also the fix for the matched-payment deadlock: when the receipt
// is matched to a payment, voiding it releases that link so the payment
// returns to "awaiting receipt" and becomes correctable/voidable again
// (see `voidPurchaseReceipt`'s doc comment in lib/domain/stock/purchases.ts).

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { useToast } from "@/components/kit/toast";
import type { StockMovementView } from "@/lib/domain/stock";
import type { ProductWithLocations } from "@/lib/domain/catalog";
import { stockApi, StockRequestError } from "../stock/use-stock";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "This delivery can no longer be voided — reload the page.",
  FORBIDDEN:
    "Only an administrator, or the person who recorded this today, can void it.",
  NOT_FOUND: "That delivery no longer exists — reload the page.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

export function ReceiptVoidDrawer({
  receipt,
  product,
  onClose,
  onDone,
}: {
  receipt: StockMovementView;
  product?: ProductWithLocations;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const matched = receipt.purchasePaymentId != null;

  async function submitVoid() {
    setSubmitting(true);
    setError(null);
    try {
      await stockApi.voidPurchaseReceipt(receipt.id);
      await onDone();
      toast("Delivery voided", { tone: "success" });
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

  return (
    <Drawer
      open
      onClose={onClose}
      title="Void Delivery"
      subtitle={product ? `${product.name} (${product.unitLabel})` : "Delivery"}
      variant="rail"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            className="grow"
            onClick={submitVoid}
            loading={submitting}
          >
            Confirm void
          </Button>
        </>
      }
    >
      {error && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {error}
        </div>
      )}

      <div className="font-ui [color:var(--text-secondary)] text-body/sm">
        This reverses the delivery: a correction row removes{" "}
        {Number(receipt.quantity).toFixed(1)}
        {product ? ` ${product.unitLabel}` : ""} from stock. The original
        entry is never overwritten — the reversal is a new linked row.
      </div>

      {matched && (
        <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          This delivery is matched to a payment. Voiding it also releases
          that match — the payment returns to "awaiting receipt" and can be
          corrected or voided on its own.
        </div>
      )}
    </Drawer>
  );
}
