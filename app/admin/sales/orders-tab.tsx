"use client";

// M2 3a — Restaurant Orders tab of the merged Sales screen (was A3,
// app/admin/orders/admin-orders-client.tsx). Restaurant orders across every
// cashier: filter toolbar + table + read-only detail drawer + full
// correction-form drawer + linked correction row-group.
//
// COMPOSED from the proven kit — no kit change:
//   • <FilterToolbar> (shared kit component, Paper IEA-0) — Cashier ·
//     Payment · Date · Corrected only (F7-8: Cashier + Payment wired)
//     — 3e retrofit off 3a's inline toolbar onto the proven component.
//   • <SimpleTable rowChevron> — Time · Cashier · Type · Total · Payment · Status
//   • <Drawer variant="rail"> — read-only detail (FYX-0) + correction form
//   • F7-4 correction form: line list + add-product, order-type + payment
//     <SegmentedControl>, delivery-fee field (Delivery only), customer-attach
//     (Credit), <CalculatedImpactBanner>, required Reason <Textarea>
//   • <EmptyState> / <ErrorState> / <Toast>
//
// §3.3 no delete affordance. §3.6 no margin / cost / profit column. Detail
// drawer stays read-only. Cashier NAME (not UUID) in the drawer subtitle.

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { Drawer } from "@/components/kit/drawer";
import { Button } from "@/components/kit/button";
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
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import { CorrectionForm } from "./correction-form";

// ── Display helpers ────────────────────────────────────────────────────

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
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

/** `YYYY-MM-DD` → "Aug 26" (Africa/Nairobi), for the date-control label. */
function fmtDayMon(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function fmtMoney(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return `KES ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** Fallback cashier label when a name isn't hydrated (rare; last-6 of UUID). */
function cashierFallback(id: string): string {
  return id.slice(-6).toUpperCase();
}

// ── Filter shape ──────────────────────────────────────────────────────

type OrdersFilter = {
  cashierId: string | null;
  date: string | null; // YYYY-MM-DD or null → "Today"
  paymentMethod: PaymentMethod | null;
  correctedOnly: boolean;
};

type DrawerMode =
  | { kind: "detail"; order: OrderView }
  | { kind: "correction"; order: OrderView }
  | null;

const ALL = "__all__";

export function OrdersTab() {
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

  // F7-8 Cashier list source: there is no /api/staff in M2, so the Cashier
  // options are derived from the orders already loaded (distinct
  // cashierId + cashierName). Zero new API; good enough for a filter. When
  // a cashier filter is active the result set is narrowed to that one
  // cashier — keep the previously-seen names so the option doesn't vanish.
  const [knownCashiers, setKnownCashiers] = React.useState<
    Map<string, string>
  >(new Map());
  React.useEffect(() => {
    setKnownCashiers((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const o of orders) {
        const name = o.cashierName || cashierFallback(o.cashierId);
        if (next.get(o.cashierId) !== name) {
          next.set(o.cashierId, name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orders]);

  const cashierOptions = React.useMemo(
    () => [
      { value: ALL, label: "All cashiers" },
      ...[...knownCashiers.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ value: id, label: name })),
    ],
    [knownCashiers],
  );

  // Client-side "corrected only": rows that are a correction OR have one.
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

  const correctionByOriginalId = React.useMemo(() => {
    const m = new Map<string, OrderView>();
    for (const o of orders) {
      if (o.correctsOrderId) m.set(o.correctsOrderId, o);
    }
    return m;
  }, [orders]);

  const numberById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.id, o.number);
    return m;
  }, [orders]);

  // ── Toolbar wiring ──────────────────────────────────────────────────

  // Date-control display label: "Today" for the default business day, "All
  // dates" for null, otherwise "Aug 26". The kit's kind:"date" carries a
  // display string as `value`; the screen owns the string↔YYYY-MM-DD map.
  const dateLabel =
    filter.date === null
      ? "All dates"
      : filter.date === today
        ? "Today"
        : fmtDayMon(filter.date);

  const controls: FilterControl[] = [
    {
      id: "cashier",
      kind: "select",
      label: "Cashier",
      options: cashierOptions,
      value: filter.cashierId ?? ALL,
      default: ALL,
    },
    {
      id: "payment",
      kind: "select",
      label: "Payment",
      options: [
        { value: ALL, label: "All" },
        { value: "cash", label: "Cash" },
        { value: "mpesa", label: "M-Pesa" },
        { value: "credit", label: "Credit" },
      ],
      value: filter.paymentMethod ?? ALL,
      default: ALL,
    },
    {
      id: "date",
      kind: "date",
      label: "Date",
      // Display string; "Today" is the default business day. Off-default
      // when the Admin has picked another day OR widened to "All dates".
      value: dateLabel,
      default: "Today",
    },
    {
      // IEA-0 draws this as a checkbox; the proven kit exposes a boolean only
      // as kind:"toggle" (ToggleSwitch). Composed as the kit offers it — a
      // checkbox `kind` would be a kit change. Flagged in the 3e summary.
      id: "correctedOnly",
      kind: "toggle",
      label: "Corrected only",
      value: filter.correctedOnly,
      default: false,
    },
  ];

  function onControlChange(id: string, value: string | boolean | null) {
    if (id === "cashier") {
      setFilter((f) => ({
        ...f,
        cashierId: value === ALL || value == null ? null : String(value),
      }));
    } else if (id === "payment") {
      setFilter((f) => ({
        ...f,
        paymentMethod:
          value === ALL || value == null ? null : (value as PaymentMethod),
      }));
    } else if (id === "date") {
      // The kit reports a picked day as a "YYYY-MM-DD" string; Reset reports
      // the default display label "Today". The empty-state "Show all dates"
      // path sets null directly (below).
      setFilter((f) => ({
        ...f,
        date: value === "Today" || value == null ? today : String(value),
      }));
    } else if (id === "correctedOnly") {
      setFilter((f) => ({ ...f, correctedOnly: Boolean(value) }));
    }
  }

  function resetFilters() {
    setFilter({
      cashierId: null,
      date: today,
      paymentMethod: null,
      correctedOnly: false,
    });
  }

  // Off-default = anything other than {no cashier, no payment, date=today,
  // not corrected-only}. `date === null` (all dates) counts as off-default.
  const anyFilterActive =
    filter.cashierId !== null ||
    filter.paymentMethod !== null ||
    filter.correctedOnly ||
    filter.date !== today;

  // The "Today" date is the default (flow doc §G) — but an empty Today is
  // still a filter narrowing the view, and the Admin needs a path to older
  // orders. Offer a "Show all dates" action on that specific empty.
  const onlyTodayFilter =
    filter.cashierId === null &&
    filter.paymentMethod === null &&
    !filter.correctedOnly &&
    filter.date === today;

  // ── Table columns ──────────────────────────────────────────────────

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
          {o.cashierName || cashierFallback(o.cashierId)}
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
        return <span className="font-ui text-success text-body/sm">Posted</span>;
      },
    },
  ];

  // Correction rows get bg-(--surface-subtle) per Paper (GCP-0 linked group).
  const drawerOrder = drawer?.order ?? null;
  const drawerOpen = drawerOrder !== null;

  return (
    <div className="flex flex-col w-full pt-(--sp-6)">
      <FilterToolbar
        aria-label="Filter orders"
        controls={controls}
        onChange={onControlChange}
        onReset={resetFilters}
        resultCount={visibleOrders.length}
        resultNoun="orders"
      />

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
          variant={anyFilterActive || onlyTodayFilter ? "filtered" : "default"}
          title={
            anyFilterActive
              ? "No orders match"
              : onlyTodayFilter
                ? "No orders today"
                : "No orders yet"
          }
          description={
            anyFilterActive
              ? "Try different filters or reset."
              : onlyTodayFilter
                ? "No orders have been recorded today. Change the date to see earlier orders."
                : "Orders placed by the Cashiers will appear here."
          }
          {...(anyFilterActive
            ? { actionLabel: "Reset filters", onAction: resetFilters }
            : onlyTodayFilter
              ? {
                  actionLabel: "Show all dates",
                  onAction: () => setFilter((f) => ({ ...f, date: null })),
                }
              : {})}
        />
      ) : (
        <>
          {/* Desktop table (≥ --bp-md) — artboard I00-0.
              NOTE (QA delta): Paper GCP-0 tints the correction row
              (bg-(--surface-subtle) + left accent bar) as a linked pair
              with its original. `SimpleTable` has no per-row styling hook
              and the kit is frozen this session, so the tint is deferred —
              the "Corrected" / "Correction of #N" status text still ties
              the pair. Flagged for QA. */}
          <div className="hidden md:block">
            <SimpleTable
              columns={columns}
              rows={visibleOrders}
              rowKey={(o) => o.id}
              onRowClick={(o) => setDrawer({ kind: "detail", order: o })}
              rowChevron
              className="w-full"
            />
          </div>

          {/* Mobile card list (< --bp-md) — artboard IJ1-0 */}
          <ul className="flex md:hidden flex-col w-full list-none">
            {visibleOrders.map((o) => {
              const isCorrection = o.correctsOrderId !== null;
              const hasCorrection = correctionByOriginalId.has(o.id);
              const origNum = isCorrection
                ? (numberById.get(o.correctsOrderId ?? "") ?? null)
                : null;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setDrawer({ kind: "detail", order: o })}
                    className={`flex w-full items-start justify-between gap-(--sp-4) py-(--sp-5) px-(--sp-6) text-left border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-interactive kit-focus-ring ${
                      isCorrection ? "bg-(--surface-subtle)" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-(--sp-1) min-w-0">
                      <span className="font-mono [color:var(--text-secondary)] text-body/sm">
                        {fmtTime(o.occurredAt)}
                      </span>
                      <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                        {(o.cashierName || cashierFallback(o.cashierId)) +
                          ` · ${ORDER_TYPE_LABEL[o.orderType]} · ${PAYMENT_LABEL[o.paymentMethod]}`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-(--sp-1) items-end shrink-0">
                      <span className="font-mono [color:var(--text-primary)] text-body/sm">
                        {fmtMoney(o.total)}
                      </span>
                      <span
                        className={`font-ui text-caption/micro ${
                          isCorrection
                            ? "[color:var(--text-tertiary)]"
                            : hasCorrection
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        {isCorrection
                          ? origNum != null
                            ? `Correction of #${origNum}`
                            : "Correction"
                          : hasCorrection
                            ? "Corrected"
                            : "Posted"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
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
            ? `Replaces order #${drawerOrder.number} · ${
                drawerOrder.cashierName || cashierFallback(drawerOrder.cashierId)
              }`
            : drawer?.kind === "detail" && drawerOrder
              ? `${drawerOrder.cashierName || cashierFallback(drawerOrder.cashierId)} · ${fmtDateShort(
                  drawerOrder.occurredAt,
                )}`
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
            onCancel={() => setDrawer({ kind: "detail", order: drawerOrder })}
            onSubmit={async (input: CorrectOrderInput) => {
              const newOrder = await correctOrder(drawerOrder.id, input);
              toast(`Correction recorded as order #${newOrder.number}`, {
                tone: "success",
              });
              setDrawer(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

// ── Order detail (read-only) ──────────────────────────────────────────

function OrderDetailContent({ order }: { order: OrderView }) {
  return (
    <div className="flex flex-col gap-(--sp-5)">
      <div className="flex flex-col gap-(--sp-2) p-(--sp-4) rounded-sm bg-(--surface-subtle)">
        <DetailRow label="Date" value={fmtDateShort(order.occurredAt)} />
        <DetailRow label="Type" value={ORDER_TYPE_LABEL[order.orderType]} />
        <DetailRow label="Payment" value={PAYMENT_LABEL[order.paymentMethod]} />
        {order.deliveryFee && (
          <DetailRow label="Delivery fee" value={fmtMoney(order.deliveryFee)} />
        )}
        <DetailRow label="Total" value={fmtMoney(order.total)} mono />
      </div>

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
                  {l.productName || l.productId}
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
