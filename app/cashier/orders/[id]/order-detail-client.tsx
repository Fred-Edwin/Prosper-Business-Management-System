"use client";

// C4 — Order detail / edit (`restaurant-sales-flow.md` walkthroughs E / F / G).
//
// EDIT GATE (plan §3.4): editable iff the order is this Cashier's own AND
// its Africa/Nairobi business day is today. Both facts come from the
// server page (`currentUserId`, `todayBusinessDate`). The API re-enforces
// it regardless.
//   • editable  → C2 line rows (<QuantityStepper>) + C3 controls
//     (<SegmentedControl> ×2, delivery fee <TextInput>), "Save changes"
//     → `editOwnOrder` (PATCH).
//   • read-only → static list + type/payment/recorded rows +
//     "Correct this (Admin)" — which does NOT open a form (Admin-only,
//     ADR-15); it surfaces the order NUMBER for the Cashier to give the
//     Admin.
//   • corrected → read-only + a CORRECTED banner + a link to the
//     correction entry ("order #{n}").
//
// COMPOSED from the kit — no kit change. Money + quantities are decimal
// STRINGS end to end.

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlowHeader } from "@/components/kit/flow-header";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { TextInput } from "@/components/kit/text-input";
import { Button } from "@/components/kit/button";
import { StatusChip } from "@/components/kit/status-chip";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type {
  EditOwnOrderInput,
  OrderType,
  PaymentMethod,
  OrderView,
} from "@/lib/domain/sales";
import { useOrder } from "@/app/cashier/use-orders";
import {
  useRestaurantProducts,
  type RestaurantProduct,
} from "@/app/cashier/use-restaurant-products";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "dine_in", label: "Dine-in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "credit", label: "Credit" },
];

function kes(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  return `KES ${Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : amount}`;
}
function nairobiTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
function nairobiDateTime(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${day} · ${nairobiTime(iso)}`;
}

/** Draft line for the editable state — quantity is a whole count in-UI. */
type DraftLine = { productId: string; qty: number; unitPrice: string; name: string };

export function OrderDetailClient({
  orderId,
  currentUserId,
  todayBusinessDate,
}: {
  orderId: string;
  currentUserId: string;
  todayBusinessDate: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { order, correction, loading, error, refresh, editOwnOrder } =
    useOrder(orderId);
  const { products } = useRestaurantProducts();

  const productById = React.useMemo(() => {
    const m = new Map<string, RestaurantProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  if (error && !order) {
    return (
      <div className="flex flex-col grow min-h-0">
        <FlowHeader title="Order" onBack={() => router.back()} className="w-full" />
        <div className="p-(--sp-6)">
          <ErrorState
            title="Couldn't load the order"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      </div>
    );
  }

  if (loading && !order) {
    return (
      <div className="flex flex-col grow min-h-0">
        <FlowHeader title="Order" onBack={() => router.back()} className="w-full" />
        <div className="flex flex-col gap-(--sp-5) p-(--sp-6)">
          {[0, 1, 2].map((i) => (
            <div key={i} className="kit-skeleton h-[48px] rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col grow min-h-0">
        <FlowHeader title="Order" onBack={() => router.back()} className="w-full" />
        <div className="flex grow items-center justify-center p-(--sp-6)">
          <EmptyState
            title="Order not found"
            description="It may belong to another cashier or no longer exist."
          />
        </div>
      </div>
    );
  }

  const isOwn = order.cashierId === currentUserId;
  const businessDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(order.occurredAt));
  const isToday = businessDate === todayBusinessDate;
  const isCorrected = correction !== null;
  const editable = isOwn && isToday && !isCorrected;

  return (
    <div className="flex flex-col grow min-h-0">
      <FlowHeader
        title={`Order · ${nairobiTime(order.occurredAt)}`}
        onBack={() => router.back()}
        className="w-full"
      />
      {editable ? (
        <EditableOrder
          order={order}
          productById={productById}
          products={products}
          onSave={async (input) => {
            await editOwnOrder(input);
            toast("Order updated", { tone: "success" });
            router.push("/cashier");
          }}
        />
      ) : (
        <ReadOnlyOrder
          order={order}
          correction={correction}
          isCorrected={isCorrected}
          productById={productById}
          onCorrectRequest={() =>
            toast(
              `Give the Admin order #${order.number} to record a correction.`,
              { tone: "info" },
            )
          }
          onGoToCorrection={
            correction
              ? () => router.push(`/cashier/orders/${correction.id}`)
              : undefined
          }
        />
      )}
    </div>
  );
}

// ── read-only (day closed OR corrected OR not own) ────────────────────

function ReadOnlyOrder({
  order,
  correction,
  isCorrected,
  productById,
  onCorrectRequest,
  onGoToCorrection,
}: {
  order: OrderView;
  correction: OrderView | null;
  isCorrected: boolean;
  productById: Map<string, RestaurantProduct>;
  onCorrectRequest: () => void;
  onGoToCorrection?: () => void;
}) {
  const lineName = (productId: string, productName?: string) =>
    productName || productById.get(productId)?.name || productId;

  return (
    <div className="flex flex-col grow min-h-0 overflow-y-auto">
      {isCorrected && correction ? (
        <div className="flex flex-col gap-(--sp-3) py-(--sp-5) px-(--sp-6) [background-color:var(--surface-subtle)]">
          <div className="flex items-center gap-(--sp-4)">
            <StatusChip variant="neutral">Corrected</StatusChip>
            <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
              on {nairobiDateTime(correction.correctedAt ?? correction.createdAt)}
              {correction.correctedByName
                ? ` by ${correction.correctedByName}`
                : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToCorrection}
            className="font-ui font-(--weight-medium) text-accent text-sm/sm text-left kit-focus-ring"
          >
            View correction entry — order #{correction.number} →
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-(--sp-4) py-(--sp-5) px-(--sp-6) bg-warning-bg">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0 mt-px">
            <path d="M12 3l9 16H3z" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinejoin="round" />
            <line x1="12" y1="10" x2="12" y2="14" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="var(--color-warning)" />
          </svg>
          <p className="font-ui [color:var(--text-secondary)] text-caption/caption">
            This order is from a closed day. It&apos;s read-only — ask the Admin
            to record a correction.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between py-(--sp-4) px-(--sp-6) [background-color:var(--surface-subtle)]">
        <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
          Items · {order.lines.length}
          {isCorrected ? " (as originally recorded)" : ""}
        </span>
      </div>

      {order.lines.map((l) => (
        <div
          key={l.id}
          className="flex items-center justify-between py-(--sp-5) px-(--sp-6) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
        >
          <span className="font-ui [color:var(--text-primary)] text-body/body">
            {lineName(l.productId, l.productName)} × {Math.round(Number(l.quantity))}
          </span>
          <span className="font-mono [color:var(--text-primary)] text-body/body">
            {kes(l.subtotal)}
          </span>
        </div>
      ))}

      <dl className="flex flex-col gap-(--sp-3) py-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <Row label="Order type" value={ORDER_TYPES.find((t) => t.value === order.orderType)?.label ?? order.orderType} />
        <Row label="Payment" value={PAYMENT_METHODS.find((p) => p.value === order.paymentMethod)?.label ?? order.paymentMethod} />
        {order.deliveryFee && <Row label="Delivery fee" value={kes(order.deliveryFee)} />}
        <Row label="Recorded" value={nairobiDateTime(order.occurredAt)} />
      </dl>

      <div className="flex items-center justify-between py-(--sp-5) px-(--sp-6)">
        <span className="font-ui [color:var(--text-secondary)] text-body/body">
          Order total
        </span>
        <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
          {kes(order.total)}
        </span>
      </div>

      {!isCorrected && (
        <div className="sticky bottom-0 flex flex-col gap-(--sp-3) shrink-0 px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          {/* Not a form — Admin-only (ADR-15). Surfaces the order number
              for the Cashier to give the Admin (flow doc walkthrough F). */}
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onCorrectRequest}
          >
            Correct this (Admin)
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-(--sp-4)">
      <dt className="font-ui [color:var(--text-secondary)] text-body/body">{label}</dt>
      <dd className="font-ui [color:var(--text-primary)] text-body/body">{value}</dd>
    </div>
  );
}

// ── editable (own + same day) ────────────────────────────────────────

function EditableOrder({
  order,
  productById,
  products,
  onSave,
}: {
  order: OrderView;
  productById: Map<string, RestaurantProduct>;
  products: RestaurantProduct[];
  onSave: (input: EditOwnOrderInput) => Promise<void>;
}) {
  const [lines, setLines] = React.useState<DraftLine[]>(() =>
    order.lines.map((l) => ({
      productId: l.productId,
      qty: Math.round(Number(l.quantity)),
      unitPrice: l.unitPrice,
      name: l.productName || productById.get(l.productId)?.name || l.productId,
    })),
  );
  const [orderTypeIdx, setOrderTypeIdx] = React.useState(
    ORDER_TYPES.findIndex((t) => t.value === order.orderType),
  );
  const [paymentIdx, setPaymentIdx] = React.useState(
    PAYMENT_METHODS.findIndex((p) => p.value === order.paymentMethod),
  );
  const [deliveryFee, setDeliveryFee] = React.useState(order.deliveryFee ?? "");
  const [addOpen, setAddOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Fill in names once products load (in case a line's product wasn't known).
  React.useEffect(() => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        name: productById.get(l.productId)?.name ?? l.name,
      })),
    );
  }, [productById]);

  const orderType = ORDER_TYPES[orderTypeIdx]?.value ?? "dine_in";
  const isDelivery = orderType === "delivery";

  function setQty(productId: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }
  function addProduct(p: RestaurantProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        { productId: p.id, qty: 1, unitPrice: p.sellingPrice, name: p.name },
      ];
    });
    setAddOpen(false);
  }

  const overStockIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of lines) {
      const p = productById.get(l.productId);
      if (p && l.qty > Number(p.stockAvailable)) s.add(l.productId);
    }
    return s;
  }, [lines, productById]);

  const selectedPayment = PAYMENT_METHODS[paymentIdx]?.value ?? "cash";
  const isCredit = selectedPayment === "credit";
  // C4's editable form has no customer-attach control (that's C5, on the
  // create flow). A credit order keeps whatever customer it already had;
  // switching a non-credit order TO credit here is not supported — Save is
  // blocked with a caption and the Cashier changes it on a new order or
  // the Admin corrects it. (F7-1 / QA S7 — the previous code always sent
  // the original `customerId`, so switching a credit order to cash was
  // rejected by the server with no path for the Cashier.)
  const creditNeedsCustomer = isCredit && !order.customerId;

  const feeNum = deliveryFee.trim() === "" ? 0 : Number(deliveryFee);
  const feeValid =
    deliveryFee.trim() === "" || /^\d+(\.\d{1,2})?$/.test(deliveryFee.trim());
  const itemsTotal = lines.reduce(
    (sum, l) => sum + Number(l.unitPrice) * l.qty,
    0,
  );
  const total = itemsTotal + (isDelivery ? feeNum : 0);

  const canSave =
    lines.length > 0 &&
    overStockIds.size === 0 &&
    (!isDelivery || feeValid) &&
    !creditNeedsCustomer &&
    !submitting;

  async function save() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const input: EditOwnOrderInput = {
        orderType,
        paymentMethod: selectedPayment,
        ...(isDelivery && deliveryFee.trim() !== ""
          ? { deliveryFee: deliveryFee.trim() }
          : {}),
        // Only attach a customer when the (new) method is credit — a
        // cash / M-Pesa order must carry no `customerId` (the domain
        // rejects one otherwise).
        ...(isCredit && order.customerId
          ? { customerId: order.customerId }
          : {}),
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: String(l.qty),
        })),
      };
      await onSave(input);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col grow min-h-0">
      <div className="flex items-start gap-(--sp-4) py-(--sp-5) px-(--sp-6) bg-success-bg">
        <span className="w-[6px] h-[6px] rounded-full shrink-0 mt-[6px] bg-success" />
        <p className="font-ui [color:var(--text-secondary)] text-caption/caption">
          Day open — you can edit this order until the day closes.
        </p>
      </div>

      <div className="flex flex-col grow min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between py-(--sp-4) px-(--sp-6) [background-color:var(--surface-subtle)]">
          <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
            Items · {lines.length}
          </span>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="font-ui font-(--weight-medium) text-accent text-sm/sm kit-focus-ring"
          >
            + Add item
          </button>
        </div>

        {addOpen && (
          <div className="flex flex-wrap content-start p-(--sp-5) gap-(--sp-4) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="flex flex-col w-[calc(50%-4px)] p-(--sp-4) rounded-sm gap-(--sp-1) text-left bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-focus-ring"
              >
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                  {p.name}
                </span>
                <span className="font-mono [color:var(--text-secondary)] text-caption/micro">
                  {kes(p.sellingPrice)} · {p.unitLabel}
                </span>
              </button>
            ))}
          </div>
        )}

        {lines.map((l) => {
          const p = productById.get(l.productId);
          const over = overStockIds.has(l.productId);
          return (
            <div
              key={l.productId}
              className={`flex items-center py-(--sp-5) px-(--sp-6) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
                over ? "border border-solid border-danger rounded-sm" : ""
              }`}
            >
              <div className="flex flex-col grow min-w-0 gap-px">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                  {l.name}
                </span>
                <span
                  className={`font-ui text-micro/micro ${
                    over ? "text-danger" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {kes(l.unitPrice)}
                  {p ? ` · ${p.unitLabel}` : ""}
                  {over
                    ? ` · only ${Number(p?.stockAvailable ?? 0).toLocaleString("en-US")} in stock`
                    : ""}
                </span>
                {over && p && (
                  <span className="font-ui text-danger text-caption/micro pt-(--sp-1)">
                    Only {Number(p.stockAvailable).toLocaleString("en-US")}{" "}
                    {p.unitLabel} in stock at the Restaurant. Reduce the quantity
                    or remove this line.
                  </span>
                )}
              </div>
              <QuantityStepper
                value={l.qty}
                min={0}
                step={1}
                onChange={(v) => setQty(l.productId, v)}
                format={(v) => String(v)}
              />
              <span className="font-mono w-[64px] text-right shrink-0 [color:var(--text-primary)] text-sm/sm">
                {kes(Number(l.unitPrice) * l.qty)}
              </span>
            </div>
          );
        })}

        <div className="flex flex-col gap-(--sp-6) p-(--sp-6)">
          <div className="flex flex-col gap-(--sp-4)">
            <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
              Order type
            </span>
            <SegmentedControl
              aria-label="Order type"
              options={ORDER_TYPES.map((o) => o.label)}
              value={ORDER_TYPES[orderTypeIdx]?.label ?? "Dine-in"}
              onChange={(label) =>
                setOrderTypeIdx(ORDER_TYPES.findIndex((o) => o.label === label))
              }
            />
          </div>

          {isDelivery && (
            <TextInput
              label="Delivery fee"
              startAdornment="KES"
              inputMode="decimal"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              error={deliveryFee.trim() !== "" && !feeValid}
              helperText={
                deliveryFee.trim() !== "" && !feeValid
                  ? "Enter a number with up to 2 decimal places"
                  : undefined
              }
            />
          )}

          <div className="flex flex-col gap-(--sp-4)">
            <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
              Payment method
            </span>
            <SegmentedControl
              aria-label="Payment method"
              options={PAYMENT_METHODS.map((o) => o.label)}
              value={PAYMENT_METHODS[paymentIdx]?.label ?? "Cash"}
              onChange={(label) =>
                setPaymentIdx(
                  PAYMENT_METHODS.findIndex((o) => o.label === label),
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between shrink-0 px-(--sp-6) py-(--sp-4) gap-(--sp-5) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          {overStockIds.size > 0 && (
            <span className="font-ui text-danger text-caption/micro">
              {overStockIds.size}{" "}
              {overStockIds.size === 1 ? "line is" : "lines are"} over available
              stock.
            </span>
          )}
          {creditNeedsCustomer && (
            <span className="font-ui text-danger text-caption/micro">
              This order has no customer — start a new credit order to attach
              one, or ask the Admin to correct it.
            </span>
          )}
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            Total
          </span>
          <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            {kes(total)}
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!canSave}
          loading={submitting}
          onClick={save}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
