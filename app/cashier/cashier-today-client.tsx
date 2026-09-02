"use client";

// C1 — Cashier Today (`restaurant-sales-flow.md` walkthrough A / H).
// This Cashier's own orders for today, newest first, with the day's
// running total. "New order" → C2.
//
// COMPOSED from the kit — no kit change:
//   • <EmptyState> (no orders) / <ErrorState> (fetch failed)
//   • per-row list (time · type · payment · total · CORRECTED chip) —
//     a screen-level row, the C1 artboard pattern (not <SimpleTable>;
//     this is the mobile card list)
//   • sticky "New order" <Button> — page-level `sticky bottom-0`
//     (flow-scaffold.tsx pattern)
//
// M2 has NO Day Close (plan §3.4): the pill is always "Day open" for
// today and `isPastDay` is a future hook that is always false here — the
// day-closed banner markup (`C0Z-0`) stays behind it. C1's scope is
// *today's own orders*, so it never actually renders in M2.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { StatusChip } from "@/components/kit/status-chip";
import type { OrderView, OrderType, PaymentMethod } from "@/lib/domain/sales";
import { useOrders } from "./use-orders";

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

/** "KES 12,450" — whole KES, thousands separated (artboard BVG-0). */
function kes(amount: string): string {
  const n = Number(amount);
  const whole = Number.isFinite(n)
    ? Math.round(n).toLocaleString("en-US")
    : amount;
  return `KES ${whole}`;
}

/** "2:14 PM" in Africa/Nairobi. */
function nairobiTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** "Wed 27 Aug" in Africa/Nairobi. */
function nairobiDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function lineCountLabel(order: OrderView): string {
  const n = order.lines.length;
  return `${n} ${n === 1 ? "item" : "items"}`;
}

function OrderRow({
  order,
  onOpen,
}: {
  order: OrderView;
  onOpen: () => void;
}) {
  // F1 (owner decision 2026-09-02): `listOrders` no longer returns an order
  // once a correction supersedes it, so the only correction state a row can
  // be in is "this row IS the correction". The artboard's "Corrected" chip
  // (on the superseded original) has nothing left to mark — that row is gone
  // from the list, which is also what stops the day's total double-counting.
  const isCorrection = order.correctsOrderId !== null;
  const meta = [
    nairobiTime(order.occurredAt),
    PAYMENT_LABEL[order.paymentMethod],
  ].join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center justify-between [width:100%] py-(--sp-6) px-(--sp-6) gap-(--sp-5) text-left border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-row kit-focus-ring"
    >
      <div className="flex flex-col gap-(--sp-1) min-w-0">
        <div className="flex items-center gap-(--sp-4)">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
            {ORDER_TYPE_LABEL[order.orderType]} · {lineCountLabel(order)}
          </span>
          {isCorrection && (
            <span className="font-ui py-px px-(--sp-3) rounded-lg [background-color:var(--surface-hover)] tracking-[0.04em] uppercase font-(--weight-medium) [color:var(--text-secondary)] text-micro/micro">
              Correction
            </span>
          )}
        </div>
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro truncate">
          {meta}
        </div>
      </div>
      <span className="font-mono [color:var(--text-primary)] text-body/body shrink-0">
        {kes(order.total)}
      </span>
    </button>
  );
}

export function CashierTodayClient() {
  const router = useRouter();
  const { orders, loading, error, refresh } = useOrders({ date: "today" });

  // M2: never past. Kept as the hook point for a real Day Close (M3).
  const isPastDay = false;

  const todayTotal = React.useMemo(
    () =>
      orders.reduce((sum, o) => {
        const n = Number(o.total);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [orders],
  );

  const dayLabel = nairobiDayLabel(new Date().toISOString());

  return (
    <div className="flex flex-col grow min-h-0">
      {/* Heading + day pill + running total */}
      <div className="flex flex-col pt-(--sp-6) pb-(--sp-5) gap-(--sp-5) px-(--sp-6)">
        <div className="flex items-center justify-between">
          <h1 className="font-ui tracking-[-0.01em] font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Today
          </h1>
          {isPastDay ? (
            <div className="flex items-center py-(--sp-2) px-(--sp-4) rounded-lg gap-(--sp-3) bg-warning-bg">
              <StatusChip variant="warning">Day closed</StatusChip>
            </div>
          ) : (
            <div className="flex items-center py-(--sp-2) px-(--sp-4) rounded-lg gap-(--sp-3) bg-success-bg">
              <StatusChip variant="success">Day open</StatusChip>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-(--sp-4)">
          <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            {kes(String(todayTotal))}
          </span>
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            {orders.length} {orders.length === 1 ? "order" : "orders"} · {dayLabel}
          </span>
        </div>

        {/* Day-closed banner — dormant in M2 (isPastDay always false). */}
        {isPastDay && (
          <div className="flex items-start gap-(--sp-4) py-(--sp-5) px-(--sp-5) rounded-md bg-warning-bg">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden
              className="shrink-0 mt-px"
            >
              <path
                d="M12 3l9 16H3z"
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <line
                x1="12"
                y1="10"
                x2="12"
                y2="14"
                stroke="var(--color-warning)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1" fill="var(--color-warning)" />
            </svg>
            <p className="font-ui [color:var(--text-secondary)] text-caption/caption">
              This day is closed. A new order still posts to today; past
              orders are read-only.
            </p>
          </div>
        )}
      </div>

      {/* List / states */}
      <div className="flex flex-col grow min-h-0 border-t border-t-solid [border-top-color:var(--border-subtle)]">
        {error ? (
          <div className="p-(--sp-6)">
            <ErrorState
              title="Couldn't load today's orders"
              description={error}
              onRetry={() => void refresh()}
            />
          </div>
        ) : loading && orders.length === 0 ? (
          <div className="flex flex-col [width:100%]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-(--sp-6) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex flex-col gap-(--sp-2)">
                  <div className="kit-skeleton h-[14px] w-[140px]" />
                  <div className="kit-skeleton h-[12px] w-[90px]" />
                </div>
                <div className="kit-skeleton h-[14px] w-[64px]" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex grow items-center justify-center p-(--sp-6)">
            <EmptyState
              title="No orders yet today"
              description="Every order you take today shows up here with its total and payment method."
            />
          </div>
        ) : (
          <div className="flex flex-col [width:100%]">
            {orders.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                onOpen={() => router.push(`/cashier/orders/${o.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky "New order" */}
      <div className="sticky bottom-0 flex items-center shrink-0 px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push("/cashier/orders/new")}
        >
          New order
        </Button>
      </div>
    </div>
  );
}
