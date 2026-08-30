"use client";

// A3 — Admin Orders list + read-only detail drawer + correction form drawer
// (`restaurant-sales-flow.md` walkthroughs F/G).
//
// COMPOSED from the proven kit — no kit change:
//   • <PageShell> + <Breadcrumb>
//   • <SimpleTable rowChevron> — Time · Cashier · Type · Total · Payment · Status
//   • <Drawer variant="rail"> — read-only detail view + correction form
//   • <QuantityStepper> — per corrected line in the correction form
//   • <CalculatedImpactBanner> — stock + money reversal preview
//   • <Textarea> — required Reason field
//   • <EmptyState> / <ErrorState> / <Toast>
//
// Paper→code notes (owner ruling 6a):
//   - Structure / hierarchy / copy / colour tokens match Paper exactly.
//   - Row heights and spacing come from kit tokens, not Paper's fixed pixels.
//   - The filter chip row matches Paper's layout: active dismissible chips +
//     inactive picker chips + count label + "Clear all" — composed as
//     screen-level elements (no kit component for this exact shape yet).
//   - Correction row gets bg-(--surface-subtle) per Paper (GCP-0 linked pair).
//   - "Cashier" column shows cashierId short-form (no /api/staff route in M2;
//     a Staff API resolves real names in a future session — flagged, not added
//     silently per CLAUDE.md).
//   - "Correction of #N": text-tertiary per Paper.
//   - §3.3: No delete affordance anywhere.
//   - §3.6: No margin / cost / profit column.

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { Drawer } from "@/components/kit/drawer";
import { Button } from "@/components/kit/button";
import { QuantityStepper } from "@/components/kit/quantity-stepper";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Textarea } from "@/components/kit/textarea";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type {
  OrderView,
  OrderType,
  PaymentMethod,
  CorrectOrderInput,
} from "@/lib/domain/sales";
import { useOrders, nairobiBusinessDate } from "@/app/cashier/use-orders";

// ── Display helpers ────────────────────────────────────────────────────

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  credit: "Credit",
};

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function fmtDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function fmtMoney(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return `KES ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** Short cashier label from UUID — a real name needs /api/staff (future session). */
function cashierLabel(id: string): string {
  // Show last 6 chars of UUID until a Staff API is available.
  return id.slice(-6).toUpperCase();
}

// ── A3: Main screen ───────────────────────────────────────────────────

// Filter shape — mirrors the Paper artboard filter chips.
type OrdersFilter = {
  cashierId: string | null; // "Cashier: …" active chip
  date: string | null;      // "Today" active chip
  paymentMethod: PaymentMethod | null;
  correctedOnly: boolean;
};

type DrawerMode =
  | { kind: "detail"; order: OrderView }
  | { kind: "correction"; order: OrderView }
  | null;

export function AdminOrdersClient() {
  const today = nairobiBusinessDate();

  const [filter, setFilter] = React.useState<OrdersFilter>({
    cashierId: null,
    date: today,
    paymentMethod: null,
    correctedOnly: false,
  });

  const { orders, loading, error, refresh, correctOrder } = useOrders({
    cashierId: filter.cashierId ?? undefined,
    date: filter.date ?? undefined,
    paymentMethod: filter.paymentMethod ?? undefined,
  });

  // Client-side: if correctedOnly, further filter rows.
  const visibleOrders = React.useMemo(() => {
    if (!filter.correctedOnly) return orders;
    const correctedIds = new Set(
      orders.filter((o) => o.correctsOrderId).map((o) => o.correctsOrderId!),
    );
    return orders.filter(
      (o) => correctedIds.has(o.id) || o.correctsOrderId !== null,
    );
  }, [orders, filter.correctedOnly]);

  const { toast } = useToast();
  const [drawer, setDrawer] = React.useState<DrawerMode>(null);

  // Map: original-order id → the correction that replaced it.
  const correctionByOriginalId = React.useMemo(() => {
    const m = new Map<string, OrderView>();
    for (const o of orders) {
      if (o.correctsOrderId) m.set(o.correctsOrderId, o);
    }
    return m;
  }, [orders]);

  // Map: order id → order number (for "Correction of #N" cells).
  const numberById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.id, o.number);
    return m;
  }, [orders]);

  // Active filter count for "N orders" counter.
  const activeFilterCount = [
    filter.cashierId,
    filter.date,
    filter.paymentMethod,
    filter.correctedOnly,
  ].filter(Boolean).length;

  function clearAll() {
    setFilter({ cashierId: null, date: null, paymentMethod: null, correctedOnly: false });
  }

  // ── Table columns ────────────────────────────────────────────────────

  const columns: SimpleTableColumn<OrderView>[] = [
    {
      key: "time",
      header: "Time",
      width: "grow basis-0",
      render: (o) => (
        <span className="font-mono [color:var(--text-secondary)] text-body/sm">
          {fmtTime(o.occurredAt)}
        </span>
      ),
    },
    {
      key: "cashier",
      header: "Cashier",
      width: "grow-[1.2] basis-0",
      render: (o) => (
        <span className="font-ui [color:var(--text-primary)] text-body/sm">
          {/* TODO(staff-api): replace with real cashier name once /api/staff exists */}
          {cashierLabel(o.cashierId)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: "grow basis-0",
      render: (o) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {ORDER_TYPE_LABEL[o.orderType]}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "grow-[1.1] basis-0",
      align: "right",
      render: (o) => (
        <span className="font-mono [color:var(--text-primary)] text-body/sm">
          {fmtMoney(o.total)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      width: "grow basis-0",
      render: (o) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {PAYMENT_LABEL[o.paymentMethod]}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "grow-[1.6] basis-0",
      render: (o) => {
        const isCorrection = o.correctsOrderId !== null;
        const correctionOrder = correctionByOriginalId.get(o.id) ?? null;

        if (isCorrection) {
          const origNum = numberById.get(o.correctsOrderId ?? "") ?? null;
          return (
            <span className="font-ui [color:var(--text-tertiary)] text-body/sm">
              {origNum != null ? `Correction of #${origNum}` : "Correction"}
            </span>
          );
        }
        if (correctionOrder !== null) {
          return (
            <span className="font-ui text-warning text-body/sm">Corrected</span>
          );
        }
        return (
          <span className="font-ui text-success text-body/sm">Posted</span>
        );
      },
    },
  ];

  // Correction rows get bg-(--surface-subtle) per Paper (GCP-0 linked group).
  const rowClassName = (o: OrderView) =>
    o.correctsOrderId !== null ? "bg-(--surface-subtle)" : undefined;

  const drawerOrder = drawer?.order ?? null;
  const drawerOpen = drawerOrder !== null;

  return (
    <PageShell
      toolbar={
        <div className="flex flex-col gap-(--sp-3) w-full">
          <Breadcrumb
            items={[{ label: "Sales", href: "/admin/orders" }, { label: "Orders" }]}
          />
          <h1 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Orders
          </h1>
        </div>
      }
    >
      {/* Filter chip row — matches Paper FA1-0 layout */}
      <div className="flex items-center flex-wrap pb-(--sp-6) gap-(--sp-3) px-(--sp-6)">
        {/* Active chips — with dismiss × */}
        {filter.cashierId && (
          <ActiveFilterChip
            label={`Cashier: ${cashierLabel(filter.cashierId)}`}
            onDismiss={() => setFilter((f) => ({ ...f, cashierId: null }))}
          />
        )}
        {filter.date && (
          <ActiveFilterChip
            label={filter.date === today ? "Today" : filter.date}
            onDismiss={() => setFilter((f) => ({ ...f, date: null }))}
          />
        )}
        {filter.paymentMethod && (
          <ActiveFilterChip
            label={PAYMENT_LABEL[filter.paymentMethod]}
            onDismiss={() => setFilter((f) => ({ ...f, paymentMethod: null }))}
          />
        )}
        {filter.correctedOnly && (
          <ActiveFilterChip
            label="Corrected only"
            onDismiss={() => setFilter((f) => ({ ...f, correctedOnly: false }))}
          />
        )}
        {/* Inactive picker chips */}
        {!filter.paymentMethod && (
          <InactiveFilterChip label="Payment method" />
        )}
        {!filter.correctedOnly && (
          <button
            type="button"
            onClick={() => setFilter((f) => ({ ...f, correctedOnly: true }))}
            className="flex items-center h-(--control-sm) px-(--sp-4) rounded-lg gap-(--sp-2) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
          >
            <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
              Corrected only
            </span>
          </button>
        )}
        {/* Count + clear */}
        {visibleOrders.length > 0 && (
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {visibleOrders.length}{" "}
            {visibleOrders.length === 1 ? "order" : "orders"}
          </span>
        )}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="font-ui font-(--weight-medium) text-accent text-caption/micro kit-focus-ring rounded-sm"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Table / states */}
      {error ? (
        <ErrorState
          title="Couldn't load orders"
          description={error}
          onRetry={() => void refresh()}
        />
      ) : loading && orders.length === 0 ? (
        <div className="flex flex-col w-full">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center h-[48px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="kit-skeleton h-[14px] w-1/2 mx-(--sp-6)" />
            </div>
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          variant={activeFilterCount > 0 ? "filtered" : "default"}
          title={activeFilterCount > 0 ? "No orders match" : "No orders yet"}
          description={
            activeFilterCount > 0
              ? "Try different filters or clear all."
              : "Orders placed by the Cashiers will appear here."
          }
        />
      ) : (
        <SimpleTable
          columns={columns}
          rows={visibleOrders}
          rowKey={(o) => o.id}
          onRowClick={(o) => setDrawer({ kind: "detail", order: o })}
          rowChevron
          className="w-full"
        />
      )}

      {/* Detail + correction Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawer(null)}
        title={
          drawer?.kind === "correction"
            ? "Record correction"
            : drawerOrder
              ? `Order #${drawerOrder.number}`
              : ""
        }
        subtitle={
          drawer?.kind === "correction" && drawerOrder
            ? `Replaces order #${drawerOrder.number} · ${cashierLabel(drawerOrder.cashierId)}`
            : undefined
        }
        variant="rail"
        footer={
          drawer?.kind === "detail" ? (
            <Button
              variant="primary"
              onClick={() =>
                drawer.order &&
                setDrawer({ kind: "correction", order: drawer.order })
              }
            >
              Record correction
            </Button>
          ) : undefined
        }
      >
        {drawerOrder && drawer?.kind === "detail" && (
          <OrderDetailContent order={drawerOrder} />
        )}
        {drawerOrder && drawer?.kind === "correction" && (
          <CorrectionForm
            original={drawerOrder}
            onCancel={() =>
              setDrawer({ kind: "detail", order: drawerOrder })
            }
            onSubmit={async (input) => {
              const newOrder = await correctOrder(drawerOrder.id, input);
              toast(
                `Correction recorded as order #${newOrder.number}`,
                { tone: "success" },
              );
              setDrawer(null);
            }}
          />
        )}
      </Drawer>
    </PageShell>
  );
}

// ── Active / inactive filter chip atoms ──────────────────────────────
// Matches Paper's filter chip shapes from FA1-0.

function ActiveFilterChip({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center h-(--control-sm) px-(--sp-4) rounded-lg gap-(--sp-2) bg-(--surface-selected) border border-solid border-accent">
      <span className="font-ui font-(--weight-medium) text-accent text-sm/sm">
        {label}
      </span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onDismiss}
        className="kit-focus-ring rounded-full"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

function InactiveFilterChip({ label }: { label: string }) {
  return (
    <div className="flex items-center h-(--control-sm) px-(--sp-4) rounded-lg gap-(--sp-2) border border-solid [border-color:var(--border-strong)]">
      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
        {label}
      </span>
    </div>
  );
}

// ── Order detail (read-only) ──────────────────────────────────────────

function OrderDetailContent({ order }: { order: OrderView }) {
  return (
    <div className="flex flex-col gap-(--sp-5)">
      {/* Header summary — surface-subtle card per Paper */}
      <div className="flex flex-col gap-(--sp-2) p-(--sp-4) rounded-sm bg-(--surface-subtle)">
        <DetailRow label="Date" value={fmtDateShort(order.occurredAt)} />
        <DetailRow
          label="Type"
          value={ORDER_TYPE_LABEL[order.orderType]}
        />
        <DetailRow
          label="Payment"
          value={PAYMENT_LABEL[order.paymentMethod]}
        />
        {order.deliveryFee && (
          <DetailRow
            label="Delivery fee"
            value={fmtMoney(order.deliveryFee)}
          />
        )}
        <DetailRow label="Total" value={fmtMoney(order.total)} mono />
      </div>

      {/* Lines */}
      <div className="flex flex-col gap-(--sp-3)">
        <span className="font-ui text-micro font-(--weight-semibold) tracking-[0.04em] uppercase leading-[14px] [color:var(--text-tertiary)]">
          Lines
        </span>
        <div className="flex flex-col">
          {order.lines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="flex flex-col gap-px min-w-0">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                  {l.productId}
                </span>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {Number(l.quantity).toLocaleString("en-US")} ×{" "}
                  {fmtMoney(l.unitPrice)}
                </span>
              </div>
              <span className="font-mono [color:var(--text-primary)] text-sm/sm shrink-0">
                {fmtMoney(l.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-(--sp-4)">
      <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
        {label}
      </span>
      <span
        className={`${mono ? "font-mono" : "font-ui"} [color:var(--text-primary)] text-caption/micro`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Correction form ───────────────────────────────────────────────────
// Matches Paper G4I-0: original context block, corrected lines (each
// in a bordered card with QuantityStepper), CalculatedImpactBanner,
// Reason Textarea, Cancel + "Record correction" footer.

type CorrectedLine = {
  productId: string;
  qty: number;
  unitPrice: string;
};

function CorrectionForm({
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
      qty: Number(l.quantity),
      unitPrice: l.unitPrice,
    })),
  );
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  function setQty(productId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }

  const correctedTotal = lines.reduce(
    (sum, l) => sum + Number(l.unitPrice) * l.qty,
    0,
  );
  const originalTotal = Number(original.total);
  const delta = correctedTotal - originalTotal;

  // Stock changes: products where corrected qty < original qty get stock back.
  const stockChanges = lines
    .filter((l) => {
      const origQty = Number(
        original.lines.find((ol) => ol.productId === l.productId)?.quantity ?? 0,
      );
      return l.qty < origQty;
    })
    .map((l) => {
      const origQty = Number(
        original.lines.find((ol) => ol.productId === l.productId)?.quantity ?? 0,
      );
      return `${l.productId} +${origQty - l.qty} back to Restaurant`;
    });

  const impactText = [
    `This replaces order #${original.number}.`,
    stockChanges.length > 0
      ? `Stock: ${stockChanges.join(", ")}.`
      : "No stock change.",
    delta < 0
      ? `Money: ${PAYMENT_LABEL[original.paymentMethod]} −${fmtMoney(String(-delta))}.`
      : delta > 0
        ? `Money: ${PAYMENT_LABEL[original.paymentMethod]} +${fmtMoney(String(delta))}.`
        : "No money change.",
    `Original #${original.number} is kept and marked Corrected.`,
  ].join(" ");

  const canSubmit = reason.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        orderType: original.orderType,
        paymentMethod: original.paymentMethod,
        ...(original.deliveryFee
          ? { deliveryFee: original.deliveryFee }
          : {}),
        ...(original.customerId
          ? { customerId: original.customerId }
          : {}),
        lines: lines
          .filter((l) => l.qty > 0)
          .map((l) => ({
            productId: l.productId,
            quantity: String(l.qty),
          })),
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
      {/* Original context block — surface-subtle per Paper */}
      <div className="flex flex-col gap-(--sp-2) p-(--sp-4) rounded-sm bg-(--surface-subtle)">
        <span className="font-ui text-micro font-(--weight-semibold) tracking-[0.04em] uppercase leading-[14px] [color:var(--text-tertiary)]">
          Original — order #{original.number}
        </span>
        <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
          {original.lines
            .map(
              (l) =>
                `${l.productId} × ${Number(l.quantity).toLocaleString("en-US")}`,
            )
            .join(" · ")}{" "}
          · {ORDER_TYPE_LABEL[original.orderType]} ·{" "}
          {PAYMENT_LABEL[original.paymentMethod]} · {fmtMoney(original.total)}
        </span>
      </div>

      {/* Corrected lines — each in a bordered card per Paper */}
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
                  {l.productId}
                </span>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {fmtMoney(l.unitPrice)} · pcs
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
            </div>
          );
        })}
      </div>

      {/* Calculated impact banner — matches Paper's amber warning-bg block */}
      <CalculatedImpactBanner>{impactText}</CalculatedImpactBanner>

      {/* Reason — required */}
      <div className="flex flex-col gap-(--sp-3)">
        <Textarea
          label="Reason *"
          placeholder="Explain what was wrong and what changed…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>

      {submitError && (
        <p className="font-ui text-danger text-caption/micro">{submitError}</p>
      )}

      {/* Footer matches Paper: Cancel (secondary) + Record correction (primary) */}
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
