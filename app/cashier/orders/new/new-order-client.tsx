"use client";

// C2 New Order — build, plus C3 Checkout and C5 Customer-attach as
// <BottomSheet> overlays (`restaurant-sales-flow.md` walkthroughs A–D).
//
// COMPOSED from the proven kit — no kit change:
//   • <FlowHeader> (back, "New order")
//   • <SearchInput>  — filters the grid
//   • <Tabs> (underline) — the `category` row ("All" + per-category;
//     `null` → "Uncategorised")
//   • a screen-level 2-col product-tile grid + a pinned order-line panel
//     (per plan §6 — compose, not a kit component)
//   • <QuantityStepper> on each line row; its `error` + `helperText`
//     carry the §3.8 over-stock block (design-principles §9.8)
//   • sticky total bar — <Button> in a page-level `sticky bottom-0`
//   • C3: <BottomSheet> + <SegmentedControl> ×2 + <TextInput> (delivery
//     fee) + a credit customer-attach block
//   • C5: <BottomSheet> + <SearchInput> + a customer list + an inline
//     quick-create form (name + phone)
//
// Kit-vs-Paper (owner ruling, 6a): the artboard draws fixed 30px stepper
// cells; we take the kit QuantityStepper size. The "KES" fee marker is a
// real in-field marker via the kit TextInput `startAdornment` prop (6c).
// Structure / hierarchy / copy / tokens match Paper.
//
// Money + quantities are decimal STRINGS end to end — never Number()-d for
// the domain call. Display formatting only.

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlowHeader } from "@/components/kit/flow-header";
import { SearchInput } from "@/components/kit/search-input";
import { Tabs, type TabItem } from "@/components/kit/tabs";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { SegmentedControl } from "@/components/kit/segmented-control";
import { TextInput } from "@/components/kit/text-input";
import { Button } from "@/components/kit/button";
import { BottomSheet, type BottomSheetState } from "@/components/kit/bottom-sheet";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type {
  CreateOrderInput,
  OrderType,
  PaymentMethod,
} from "@/lib/domain/sales";
import type { CustomerListRow } from "@/lib/domain/customers";
import { useCustomers } from "@/app/admin/customers/use-customers";
import { useOrders } from "@/app/cashier/use-orders";
import {
  useRestaurantProducts,
  type RestaurantProduct,
} from "@/app/cashier/use-restaurant-products";

const UNCATEGORISED = "Uncategorised";

/** "KES 250" — whole KES, thousands separated. */
function kes(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  return `KES ${Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : amount}`;
}

/** A draft order line — quantity kept as a plain integer count in the UI
 * (the stepper is whole units), stringified only at the domain call. */
type DraftLine = { productId: string; qty: number };

// ── C2: build ─────────────────────────────────────────────────────────

export function NewOrderClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { products, loading, error, refresh } = useRestaurantProducts();
  const { createOrder } = useOrders({});

  const [search, setSearch] = React.useState("");
  const [activeCat, setActiveCat] = React.useState("all");
  const [lines, setLines] = React.useState<DraftLine[]>([]);
  const [checkoutState, setCheckoutState] =
    React.useState<BottomSheetState>("closed");

  const productById = React.useMemo(() => {
    const m = new Map<string, RestaurantProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  // Category tabs: "All" + one per distinct category (null → Uncategorised).
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category ?? UNCATEGORISED);
    return Array.from(set);
  }, [products]);

  const tabs: TabItem[] = React.useMemo(
    () => [
      { key: "all", label: "All" },
      ...categories.map((c) => ({ key: c, label: c })),
    ],
    [categories],
  );

  const visibleProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const cat = p.category ?? UNCATEGORISED;
      if (activeCat !== "all" && cat !== activeCat) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeCat]);

  const qtyFor = React.useCallback(
    (productId: string) =>
      lines.find((l) => l.productId === productId)?.qty ?? 0,
    [lines],
  );

  function addOne(productId: string) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
  }

  function setQty(productId: string, qty: number) {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.productId !== productId);
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, qty } : l));
      }
      return [...prev, { productId, qty }];
    });
  }

  // §3.8: a line is over-stock when its qty exceeds the product's derived
  // Restaurant balance. Client courtesy — the server is still the gate.
  const overStockIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of lines) {
      const p = productById.get(l.productId);
      if (p && l.qty > Number(p.stockAvailable)) s.add(l.productId);
    }
    return s;
  }, [lines, productById]);

  const itemsTotal = React.useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = productById.get(l.productId);
        return sum + (p ? Number(p.sellingPrice) * l.qty : 0);
      }, 0),
    [lines, productById],
  );

  const lineCount = lines.reduce((n, l) => n + l.qty, 0);
  const hasOverStock = overStockIds.size > 0;
  const canReview = lines.length > 0 && !hasOverStock;

  async function handleConfirm(
    input: Omit<CreateOrderInput, "lines">,
  ): Promise<void> {
    const payloadLines = lines.map((l) => ({
      productId: l.productId,
      quantity: String(l.qty),
    }));
    const order = await createOrder({ ...input, lines: payloadLines });
    toast(`Order recorded · ${kes(order.total)}`, { tone: "success" });
    setCheckoutState("closed");
    router.push("/cashier");
  }

  return (
    <div className="flex flex-col grow min-h-0">
      <FlowHeader
        title="New order"
        onBack={() => router.back()}
        className="w-full"
      />

      {/* Search + category tabs */}
      <div className="flex flex-col shrink-0 pt-(--sp-5) gap-(--sp-5) px-(--sp-6)">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products…"
          aria-label="Search products"
        />
      </div>
      <div className="shrink-0 px-(--sp-6)">
        <Tabs
          tabs={tabs}
          activeKey={activeCat}
          onChange={setActiveCat}
          idBase="c2-category"
        />
      </div>

      {/* Product grid / states */}
      <div className="flex flex-col grow min-h-0 overflow-y-auto">
        {error ? (
          <div className="p-(--sp-6)">
            <ErrorState
              title="Couldn't load products"
              description={error}
              onRetry={() => void refresh()}
            />
          </div>
        ) : loading && products.length === 0 ? (
          <div className="flex flex-wrap content-start p-(--sp-6) gap-(--sp-4)">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[calc(50%-4px)] h-[92px] rounded-lg kit-skeleton"
              />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="flex grow items-center justify-center p-(--sp-6)">
            <EmptyState
              variant={search.trim() ? "filtered" : "default"}
              title={
                search.trim() ? "No products match" : "No products to sell"
              }
              description={
                search.trim()
                  ? "Try a different search or category."
                  : "An Admin adds products and their Restaurant price in the Catalog."
              }
            />
          </div>
        ) : (
          <div className="flex flex-wrap content-start p-(--sp-6) gap-(--sp-4)">
            {visibleProducts.map((p) => {
              const qty = qtyFor(p.id);
              const inOrder = qty > 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addOne(p.id)}
                  className={`flex flex-col w-[calc(50%-4px)] p-(--sp-5) rounded-lg gap-(--sp-2) relative text-left kit-focus-ring border border-solid ${
                    inOrder
                      ? "bg-(--surface-selected) border-accent"
                      : "bg-(--surface-page) [border-color:var(--border-strong)]"
                  }`}
                >
                  <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
                    {p.name}
                  </span>
                  <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                    {kes(p.sellingPrice)} · {p.unitLabel}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {Number(p.stockAvailable).toLocaleString("en-US")} in stock
                  </span>
                  {inOrder && (
                    <span className="absolute top-(--sp-4) right-(--sp-4) flex items-center justify-center min-w-[20px] h-[20px] px-[5px] rounded-full bg-accent">
                      <span className="font-mono font-(--weight-semibold) text-white text-caption/micro">
                        {qty}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned order-line panel */}
      <div className="flex flex-col shrink-0 bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-strong)] max-h-[45vh] overflow-y-auto">
        <div className="flex items-center justify-between py-(--sp-4) px-(--sp-6) [background-color:var(--surface-subtle)] sticky top-0">
          <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
            Order · {lineCount} {lineCount === 1 ? "item" : "items"}
          </span>
          {lines.length > 0 && (
            <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              Tap a qty to type
            </span>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="py-(--sp-7) px-(--sp-6) text-center font-ui [color:var(--text-tertiary)] text-body/body">
            Tap a product above to start the order.
          </p>
        ) : (
          lines.map((l) => {
            const p = productById.get(l.productId);
            if (!p) return null;
            const over = overStockIds.has(l.productId);
            const subtotal = Number(p.sellingPrice) * l.qty;
            return (
              <div
                key={l.productId}
                className={`flex items-center py-(--sp-4) px-(--sp-6) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
                  over ? "border border-solid border-danger rounded-sm" : ""
                }`}
              >
                <div className="flex flex-col grow min-w-0 gap-px">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                    {p.name}
                  </span>
                  <span
                    className={`font-ui text-micro/micro ${
                      over ? "text-danger" : "[color:var(--text-secondary)]"
                    }`}
                  >
                    {kes(p.sellingPrice)} · {p.unitLabel} ·{" "}
                    {over
                      ? `only ${Number(p.stockAvailable).toLocaleString("en-US")} in stock`
                      : `${Number(p.stockAvailable).toLocaleString("en-US")} in stock`}
                  </span>
                  {over && (
                    <span className="font-ui text-danger text-caption/micro pt-(--sp-1)">
                      Only {Number(p.stockAvailable).toLocaleString("en-US")}{" "}
                      {p.unitLabel} in stock at the Restaurant. Reduce the
                      quantity or remove this line.
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
                  {kes(subtotal)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky total bar */}
      <div className="sticky bottom-0 flex items-center justify-between shrink-0 px-(--sp-6) py-(--sp-4) gap-(--sp-5) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          {hasOverStock && (
            <span className="font-ui text-danger text-caption/micro">
              {overStockIds.size}{" "}
              {overStockIds.size === 1 ? "line is" : "lines are"} over available
              stock.
            </span>
          )}
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            Total
          </span>
          <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            {kes(itemsTotal)}
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!canReview}
          onClick={() => setCheckoutState("open")}
        >
          Review order
        </Button>
      </div>

      {/* C3 — checkout sheet */}
      <CheckoutSheet
        state={checkoutState}
        onStateChange={setCheckoutState}
        lines={lines}
        productById={productById}
        itemsTotal={itemsTotal}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

// ── C3: checkout sheet ────────────────────────────────────────────────

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

function CheckoutSheet({
  state,
  onStateChange,
  lines,
  productById,
  itemsTotal,
  onConfirm,
}: {
  state: BottomSheetState;
  onStateChange: (s: BottomSheetState) => void;
  lines: DraftLine[];
  productById: Map<string, RestaurantProduct>;
  itemsTotal: number;
  onConfirm: (input: Omit<CreateOrderInput, "lines">) => Promise<void>;
}) {
  const [orderTypeIdx, setOrderTypeIdx] = React.useState(0);
  const [paymentIdx, setPaymentIdx] = React.useState(0);
  const [deliveryFee, setDeliveryFee] = React.useState("");
  const [customer, setCustomer] = React.useState<CustomerListRow | null>(null);
  const [attachOpen, setAttachOpen] = React.useState<BottomSheetState>("closed");
  const [submitting, setSubmitting] = React.useState(false);

  const orderType = ORDER_TYPES[orderTypeIdx].value;
  const payment = PAYMENT_METHODS[paymentIdx].value;
  const isDelivery = orderType === "delivery";
  const isCredit = payment === "credit";

  // Reset when the sheet closes.
  React.useEffect(() => {
    if (state === "closed") {
      setOrderTypeIdx(0);
      setPaymentIdx(0);
      setDeliveryFee("");
      setCustomer(null);
    }
  }, [state]);

  const feeNum = deliveryFee.trim() === "" ? 0 : Number(deliveryFee);
  const feeValid =
    deliveryFee.trim() === "" || /^\d+(\.\d{1,2})?$/.test(deliveryFee.trim());
  const total = itemsTotal + (isDelivery ? feeNum : 0);

  const confirmDisabled =
    submitting || (isCredit && !customer) || (isDelivery && !feeValid);

  async function submit() {
    if (confirmDisabled) return;
    setSubmitting(true);
    try {
      const input: Omit<CreateOrderInput, "lines"> = {
        orderType,
        paymentMethod: payment,
        ...(isDelivery && deliveryFee.trim() !== ""
          ? { deliveryFee: deliveryFee.trim() }
          : {}),
        ...(isCredit && customer ? { customerId: customer.id } : {}),
      };
      await onConfirm(input);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet state={state} onStateChange={onStateChange} title="Checkout">
      <div className="flex flex-col gap-(--sp-6)">
        {/* Order type */}
        <div className="flex flex-col gap-(--sp-4)">
          <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
            Order type
          </span>
          <SegmentedControl
            aria-label="Order type"
            options={ORDER_TYPES.map((o) => o.label)}
            value={ORDER_TYPES[orderTypeIdx].label}
            onChange={(label) =>
              setOrderTypeIdx(ORDER_TYPES.findIndex((o) => o.label === label))
            }
          />
        </div>

        {/* Delivery fee — only for Delivery. "KES" is an in-field prefix
            (kit TextInput `startAdornment`), matching artboard DRN-0. */}
        {isDelivery && (
          <TextInput
            label="Delivery fee"
            startAdornment="KES"
            inputMode="decimal"
            placeholder="0"
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

        {/* Payment method */}
        <div className="flex flex-col gap-(--sp-4)">
          <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
            Payment method
          </span>
          <SegmentedControl
            aria-label="Payment method"
            options={PAYMENT_METHODS.map((o) => o.label)}
            value={PAYMENT_METHODS[paymentIdx].label}
            onChange={(label) =>
              setPaymentIdx(
                PAYMENT_METHODS.findIndex((o) => o.label === label),
              )
            }
          />
        </div>

        {/* Credit → customer-attach block (plan §3.2). Confirm stays
            disabled until a customer is attached. */}
        {isCredit && (
          <div className="flex flex-col gap-(--sp-4) p-(--sp-5) rounded-md border border-solid [border-color:var(--border-strong)]">
            {customer ? (
              <div className="flex items-center justify-between gap-(--sp-4)">
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm truncate">
                    {customer.name}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro truncate">
                    {customer.phone} · {balanceLabel(customer.balance)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachOpen("open")}
                  className="font-ui font-(--weight-medium) text-accent text-sm/sm shrink-0 kit-focus-ring"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-(--sp-1)">
                  <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/body">
                    Credit order — attach a customer
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    Creates a debt against their balance — no money is recorded
                    now.
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setAttachOpen("open")}
                >
                  Choose customer
                </Button>
              </>
            )}
          </div>
        )}

        {/* Order summary */}
        <div className="flex flex-col gap-(--sp-3) border-t border-t-solid [border-top-color:var(--border-subtle)] pt-(--sp-5)">
          <span className="font-ui tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
            Order · {lines.reduce((n, l) => n + l.qty, 0)} items
          </span>
          {lines.map((l) => {
            const p = productById.get(l.productId);
            if (!p) return null;
            return (
              <div
                key={l.productId}
                className="flex items-center justify-between gap-(--sp-4)"
              >
                <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  {p.name} × {l.qty}
                </span>
                <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                  {kes(Number(p.sellingPrice) * l.qty)}
                </span>
              </div>
            );
          })}
          {isDelivery && feeNum > 0 && (
            <>
              <div className="flex items-center justify-between gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)] pt-(--sp-3)">
                <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  Items subtotal
                </span>
                <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                  {kes(itemsTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-(--sp-4)">
                <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  Delivery fee
                </span>
                <span className="font-mono [color:var(--text-primary)] text-sm/sm">
                  {kes(feeNum)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer: total + confirm */}
        <div className="flex flex-col gap-(--sp-3) border-t border-t-solid [border-top-color:var(--border-subtle)] pt-(--sp-5)">
          {isCredit && !customer && (
            <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
              Attach a customer to confirm a credit order.
            </span>
          )}
          <div className="flex items-center justify-between gap-(--sp-5)">
            <div className="flex flex-col gap-(--sp-1)">
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
              disabled={confirmDisabled}
              loading={submitting}
              onClick={submit}
            >
              Confirm order
            </Button>
          </div>
        </div>
      </div>

      {/* C5 — customer attach / quick-create (sheet over the sheet) */}
      <CustomerAttachSheet
        state={attachOpen}
        onStateChange={setAttachOpen}
        onAttach={(c) => {
          setCustomer(c);
          setAttachOpen("closed");
        }}
      />
    </BottomSheet>
  );
}

/** "owes KES 1,200" / "Settled" / "KES 300 in credit". */
function balanceLabel(balance: string): string {
  const n = Number(balance);
  if (!Number.isFinite(n) || n === 0) return "Settled";
  const abs = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n > 0 ? `owes KES ${abs}` : `KES ${abs} in credit`;
}

// ── C5: customer attach / quick-create ────────────────────────────────

function CustomerAttachSheet({
  state,
  onStateChange,
  onAttach,
}: {
  state: BottomSheetState;
  onStateChange: (s: BottomSheetState) => void;
  onAttach: (c: CustomerListRow) => void;
}) {
  const [search, setSearch] = React.useState("");
  const { customers, loading, createCustomer } = useCustomers({ search });
  const [nameOverride, setNameOverride] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  // Forced open by the "Add new customer" row even when the search matched.
  const [forceCreate, setForceCreate] = React.useState(false);

  React.useEffect(() => {
    if (state === "closed") {
      setSearch("");
      setNameOverride(null);
      setPhone("");
      setCreateError(null);
      setForceCreate(false);
    }
  }, [state]);

  const trimmed = search.trim();
  const showCreate =
    forceCreate || (trimmed !== "" && !loading && customers.length === 0);

  // The name field tracks the search text until the Cashier edits it.
  const name = nameOverride ?? trimmed;

  const phoneValid = /^[0-9+\s-]{7,}$/.test(phone.trim());
  const canCreate = name.trim() !== "" && phoneValid && !creating;

  async function quickCreate() {
    if (!canCreate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
      });
      // A brand-new customer has a zero derived balance.
      onAttach({
        id: created.id,
        name: created.name,
        phone: created.phone,
        balance: "0.00",
        lastActivityAt: null,
      });
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Couldn't add the customer.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <BottomSheet
      state={state}
      onStateChange={onStateChange}
      title="Attach customer"
    >
      <div className="flex flex-col gap-(--sp-5)">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or phone…"
          aria-label="Search customers"
        />

        {showCreate ? (
          <div className="flex flex-col gap-(--sp-5)">
            <p className="font-ui [color:var(--text-secondary)] text-sm/sm">
              {trimmed !== ""
                ? `No customer matches “${trimmed}”. Add them:`
                : "Add a new customer:"}
            </p>
            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setNameOverride(e.target.value)}
            />
            <TextInput
              label="Phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phone.trim() !== "" && !phoneValid}
              helperText={
                phone.trim() !== "" && !phoneValid
                  ? "Enter a valid phone number"
                  : undefined
              }
            />
            {createError && (
              <p className="font-ui text-danger text-caption/micro">
                {createError}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canCreate}
              loading={creating}
              onClick={quickCreate}
            >
              Add customer &amp; attach
            </Button>
          </div>
        ) : loading && customers.length === 0 ? (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center h-[56px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="kit-skeleton h-[14px] w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAttach(c)}
                className="flex items-center justify-between [width:100%] py-(--sp-5) gap-(--sp-4) text-left border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-row kit-focus-ring"
              >
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm truncate">
                    {c.name}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-sm/micro truncate">
                    {c.phone}
                  </span>
                </div>
                <BalanceReadout balance={c.balance} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setForceCreate(true)}
              className="flex items-center gap-(--sp-4) py-(--sp-5) text-left kit-focus-ring"
            >
              <span className="font-ui text-accent text-h2/h2 leading-none">
                +
              </span>
              <span className="font-ui font-(--weight-medium) text-accent text-body/body">
                Add new customer
              </span>
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/** "owes KES 1,200" (danger) / "Settled" (tertiary). */
function BalanceReadout({ balance }: { balance: string }) {
  const n = Number(balance);
  if (!Number.isFinite(n) || n === 0) {
    return (
      <span className="font-ui [color:var(--text-tertiary)] text-sm/sm shrink-0">
        Settled
      </span>
    );
  }
  const abs = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <span
      className={`font-mono text-sm/sm shrink-0 ${n > 0 ? "text-danger" : "text-success"}`}
    >
      {n > 0 ? `owes KES ${abs}` : `KES ${abs} cr`}
    </span>
  );
}

