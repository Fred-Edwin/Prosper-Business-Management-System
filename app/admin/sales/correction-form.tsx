"use client";

// M2 3a — F7-4: the full corrected-order form in the A3 correction drawer.
//
// Before 3a the correction form was quantity-only, so `correctOrder`'s
// payment-method / order-type / delivery-fee / add-line paths were
// UI-unreachable (QA S7 F7-4). This rebuilds it to match the flow doc
// (`customers-credit-flow.md` §G step 3 / `restaurant-sales-flow.md` §E):
// the Admin restates the WHOLE corrected order.
//
// COMPOSED from the proven kit — no kit change:
//   • corrected line list — <QuantityStepper> per line + remove, plus a
//     searchable add-product row (kit <Select searchable> over the
//     Restaurant menu — the C2 tap-to-add pattern in a picker form)
//   • order type — <SegmentedControl> (Dine-in / Takeaway / Delivery)
//   • payment method — <SegmentedControl> (Cash / M-Pesa / Credit)
//   • delivery fee — <TextInput> (numeric) shown only for Delivery
//   • Credit ⇒ a customer must be attached (parity with C3 checkout) —
//     reuses <Select searchable> over useCustomers()
//   • <CalculatedImpactBanner> — reflects payment-method + fee changes;
//     credit deltas labelled "Customer debt" (F7-5, kept + extended)
//   • required Reason <Textarea>
//
// The domain (`validateOrder`, shared by create/edit/correct) is the gate:
// it enforces delivery-fee-only-on-delivery, credit⇒customerId, the §3.8
// stock BLOCK. The client checks here are courtesies; server errors surface
// inline.
//
// Paper: G4I-0 is the pre-3a quantity-only drawer; the flow docs (above)
// specify the fuller form 3a builds. Residual artboard delta noted for QA.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { Select } from "@/components/kit/select";
import { TextInput } from "@/components/kit/text-input";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Textarea } from "@/components/kit/textarea";
import type {
  OrderView,
  OrderType,
  PaymentMethod,
  CorrectOrderInput,
} from "@/lib/domain/sales";
import { useRestaurantProducts } from "@/app/cashier/use-restaurant-products";
import { useCustomers } from "@/app/admin/customers/use-customers";
import { PAYMENT_LABEL, fmtMoney } from "./orders-tab";

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

const ORDER_TYPE_OPTIONS = ["Dine-in", "Takeaway", "Delivery"] as const;
const ORDER_TYPE_BY_LABEL: Record<string, OrderType> = {
  "Dine-in": "dine_in",
  Takeaway: "takeaway",
  Delivery: "delivery",
};

const PAYMENT_OPTIONS = ["Cash", "M-Pesa", "Credit"] as const;
const PAYMENT_BY_LABEL: Record<string, PaymentMethod> = {
  Cash: "cash",
  "M-Pesa": "mpesa",
  Credit: "credit",
};

type CorrectedLine = {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: string;
};

export function CorrectionForm({
  original,
  onCancel,
  onSubmit,
}: {
  original: OrderView;
  onCancel: () => void;
  onSubmit: (input: CorrectOrderInput) => Promise<void>;
}) {
  const [lines, setLines] = React.useState<CorrectedLine[]>(
    original.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName || l.productId,
      qty: Number(l.quantity),
      unitPrice: l.unitPrice,
    })),
  );
  const [orderType, setOrderType] = React.useState<OrderType>(original.orderType);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    original.paymentMethod,
  );
  const [deliveryFee, setDeliveryFee] = React.useState<string>(
    original.deliveryFee ?? "",
  );
  const [customerId, setCustomerId] = React.useState<string | null>(
    original.customerId,
  );
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Restaurant menu for the add-product row (admin is in PRODUCT_READ_ROLES).
  const { products } = useRestaurantProducts();
  const addable = React.useMemo(
    () => products.filter((p) => !lines.some((l) => l.productId === p.id)),
    [products, lines],
  );

  // Customers for the Credit-order attach (parity with C3).
  const { customers } = useCustomers({});

  function setQty(productId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function addLine(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setLines((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        qty: 1,
        unitPrice: p.sellingPrice,
      },
    ]);
  }

  const isDelivery = orderType === "delivery";
  const isCredit = paymentMethod === "credit";

  // ── Impact preview ────────────────────────────────────────────────────
  // F7-5: computed against the SAME inputs the request will send; credit
  // deltas labelled "Customer debt"; delivery fee folded into both totals.
  const feeNum = isDelivery && deliveryFee !== "" ? Number(deliveryFee) || 0 : 0;
  const correctedLineTotal = lines.reduce(
    (sum, l) => sum + Number(l.unitPrice) * l.qty,
    0,
  );
  const correctedTotal = correctedLineTotal + feeNum;
  const originalTotal = Number(original.total);
  const delta = correctedTotal - originalTotal;

  // Lines whose corrected qty < original qty → stock returns to Restaurant.
  const stockBack = lines
    .map((l) => {
      const origQty = Number(
        original.lines.find((ol) => ol.productId === l.productId)?.quantity ?? 0,
      );
      return { name: l.productName || l.productId, diff: origQty - l.qty };
    })
    .filter((s) => s.diff > 0)
    .map((s) => `${s.name} +${s.diff} back to Restaurant`);
  // New / increased lines pull more stock out.
  const stockOut = lines
    .map((l) => {
      const origQty = Number(
        original.lines.find((ol) => ol.productId === l.productId)?.quantity ?? 0,
      );
      return { name: l.productName || l.productId, diff: l.qty - origQty };
    })
    .filter((s) => s.diff > 0)
    .map((s) => `${s.name} −${s.diff} from Restaurant`);
  const stockNote = [...stockBack, ...stockOut];

  const paymentChanged = paymentMethod !== original.paymentMethod;
  const correctedChannel = isCredit
    ? "Customer debt"
    : PAYMENT_LABEL[paymentMethod];
  const originalChannel =
    original.paymentMethod === "credit"
      ? "Customer debt"
      : PAYMENT_LABEL[original.paymentMethod];

  let moneyLine: string;
  if (paymentChanged) {
    moneyLine = `${originalChannel} −${fmtMoney(String(originalTotal))}; ${correctedChannel} +${fmtMoney(
      String(correctedTotal),
    )}.`;
  } else if (delta < 0) {
    moneyLine = `${correctedChannel}: −${fmtMoney(String(-delta))}.`;
  } else if (delta > 0) {
    moneyLine = `${correctedChannel}: +${fmtMoney(String(delta))}.`;
  } else {
    moneyLine = `No ${isCredit ? "debt" : "money"} change.`;
  }

  const impactText = [
    `This replaces order #${original.number}.`,
    stockNote.length > 0 ? `Stock: ${stockNote.join(", ")}.` : "No stock change.",
    moneyLine,
    `Original #${original.number} is kept and marked Corrected.`,
  ].join(" ");

  // ── Submit gating ────────────────────────────────────────────────────
  const hasLine = lines.some((l) => l.qty > 0);
  const creditNeedsCustomer = isCredit && !customerId;
  const canSubmit =
    reason.trim().length > 0 && hasLine && !creditNeedsCustomer && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        orderType,
        paymentMethod,
        ...(isDelivery && deliveryFee !== ""
          ? { deliveryFee: String(Number(deliveryFee)) }
          : {}),
        ...(isCredit && customerId ? { customerId } : {}),
        lines: lines
          .filter((l) => l.qty > 0)
          .map((l) => ({ productId: l.productId, quantity: String(l.qty) })),
      });
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Couldn't record the correction.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-(--sp-5)">
      {/* Original context block — surface-subtle per Paper G4I-0 */}
      <div className="flex flex-col gap-(--sp-2) p-(--sp-4) rounded-sm bg-(--surface-subtle)">
        <span className="font-ui text-micro font-(--weight-semibold) tracking-[0.04em] uppercase leading-[14px] [color:var(--text-tertiary)]">
          Original — order #{original.number}
        </span>
        <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
          {original.lines
            .map(
              (l) =>
                `${l.productName || l.productId} × ${Number(l.quantity).toLocaleString("en-US")}`,
            )
            .join(" · ")}{" "}
          · {ORDER_TYPE_LABEL[original.orderType]} ·{" "}
          {PAYMENT_LABEL[original.paymentMethod]} · {fmtMoney(original.total)}
        </span>
      </div>

      {/* Corrected lines */}
      <div className="flex flex-col gap-(--sp-3)">
        <span className="font-ui text-micro font-(--weight-semibold) tracking-[0.04em] uppercase leading-[14px] [color:var(--text-tertiary)]">
          Corrected lines
        </span>
        {lines.map((l) => {
          const subtotal = Number(l.unitPrice) * l.qty;
          return (
            <div
              key={l.productId}
              className="flex items-center p-(--sp-4) rounded-sm gap-(--sp-4) border border-solid [border-color:var(--border-subtle)]"
            >
              <div className="grow basis-0 flex flex-col gap-px min-w-0">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                  {l.productName || l.productId}
                </span>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {fmtMoney(l.unitPrice)}
                </span>
              </div>
              <QuantityStepper
                value={l.qty}
                min={0}
                step={1}
                onChange={(v) => setQty(l.productId, v)}
                format={(v) => String(v)}
              />
              <span className="font-mono w-[64px] text-right shrink-0 [color:var(--text-primary)] text-sm/sm">
                {fmtMoney(String(subtotal))}
              </span>
              <button
                type="button"
                aria-label={`Remove ${l.productName || l.productId}`}
                onClick={() => removeLine(l.productId)}
                className="shrink-0 [color:var(--text-tertiary)] kit-interactive kit-focus-ring rounded-sm p-[2px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Add a product — searchable Select over the Restaurant menu */}
        {addable.length > 0 && (
          <div role="group" aria-label="Add a product">
            <Select
              searchable
              placeholder="Add a product…"
              noMatchesLabel="No matching products"
              options={addable.map((p) => ({
                value: p.id,
                label: `${p.name} · ${fmtMoney(p.sellingPrice)}`,
              }))}
              value=""
              onChange={(v) => v && addLine(v)}
            />
          </div>
        )}
      </div>

      {/* Order type */}
      <SegmentedControl
        label="Order type"
        options={[...ORDER_TYPE_OPTIONS]}
        value={ORDER_TYPE_LABEL[orderType]}
        onChange={(v) => {
          const next = ORDER_TYPE_BY_LABEL[v];
          setOrderType(next);
          if (next !== "delivery") setDeliveryFee("");
        }}
      />

      {/* Delivery fee — only for Delivery */}
      {isDelivery && (
        <TextInput
          label="Delivery fee (KES)"
          inputMode="decimal"
          value={deliveryFee}
          onChange={(e) => setDeliveryFee(e.target.value)}
          placeholder="0.00"
        />
      )}

      {/* Payment method */}
      <SegmentedControl
        label="Payment method"
        options={[...PAYMENT_OPTIONS]}
        value={PAYMENT_LABEL[paymentMethod]}
        onChange={(v) => {
          const next = PAYMENT_BY_LABEL[v];
          setPaymentMethod(next);
          if (next !== "credit") setCustomerId(null);
        }}
      />

      {/* Credit ⇒ attach a customer (parity with C3) */}
      {isCredit && (
        <div className="flex flex-col gap-(--sp-2)" role="group" aria-label="Customer">
          <Select
            searchable
            placeholder="Attach a customer…"
            noMatchesLabel="No matching customers"
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.name} · ${c.phone}`,
            }))}
            value={customerId ?? ""}
            onChange={(v) => setCustomerId(v || null)}
          />
          {creditNeedsCustomer && (
            <span className="font-ui [color:var(--color-danger)] text-caption/micro">
              Attach a customer to record a credit correction.
            </span>
          )}
        </div>
      )}

      {/* Calculated impact banner */}
      <CalculatedImpactBanner>{impactText}</CalculatedImpactBanner>

      {/* Reason — required */}
      <Textarea
        label="Reason *"
        placeholder="Explain what was wrong and what changed…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />

      {submitError && (
        <p className="font-ui [color:var(--color-danger)] text-caption/micro">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-end gap-(--sp-4) pt-(--sp-2)">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!canSubmit}
          loading={submitting}
          onClick={submit}
        >
          Record correction
        </Button>
      </div>
    </div>
  );
}
