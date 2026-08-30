"use client";

import * as React from "react";
import type {
  CreateOrderInput,
  EditOwnOrderInput,
  CorrectOrderInput,
  ListOrdersFilter,
  OrderView,
} from "@/lib/domain/sales";

/**
 * All Restaurant-order data-fetching for the Cashier flow (C1–C4) lives
 * here; A3 (Admin orders, 6d) reuses it. Pure presentation over this hook.
 * Mirrors `app/admin/customers/use-customers.ts` / `use-catalog.ts`
 * exactly — the `request<T>` helper, a typed `*RequestError`,
 * domain-typed shapes, `refresh()`.
 *
 * Money + quantities cross the boundary as decimal **strings** — the hook
 * never `Number()`-parses them for the domain call; screens format for
 * display with local helpers only.
 */

export type ApiError = { code: string; message: string; field?: string };

export class OrdersRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "OrdersRequestError";
    this.code = err.code;
    this.field = err.field;
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: ApiError }
    | null;

  if (!res.ok || !json || "error" in json) {
    const err: ApiError =
      json && "error" in json
        ? json.error
        : { code: "INTERNAL_ERROR", message: "Request failed." };
    throw new OrdersRequestError(res.status, err);
  }
  return json.data;
}

/**
 * `filter.date` is a business date (`YYYY-MM-DD`) or the literal
 * `"today"` — the client resolves `"today"` against Africa/Nairobi so C1
 * doesn't depend on the server's clock for the query string.
 */
export type OrdersListFilter = Omit<ListOrdersFilter, "date"> & {
  date?: string | "today";
};

const NAIROBI_TZ = "Africa/Nairobi";

/** Africa/Nairobi business date as `YYYY-MM-DD` (ADR-29 boundary). */
export function nairobiBusinessDate(at: Date = new Date()): string {
  // en-CA gives ISO `YYYY-MM-DD`; the tz option does the offset.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Is this order's business day today (Africa/Nairobi)? Gates C4 edit-vs-read. */
export function isSameBusinessDay(occurredAtIso: string): boolean {
  return nairobiBusinessDate(new Date(occurredAtIso)) === nairobiBusinessDate();
}

export function useOrders(filter: OrdersListFilter = {}) {
  const [orders, setOrders] = React.useState<OrderView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { cashierId, date, paymentMethod, orderType } = filter;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cashierId) params.set("cashierId", cashierId);
      if (date) params.set("date", date === "today" ? nairobiBusinessDate() : date);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);
      if (orderType) params.set("orderType", orderType);
      const rows = await request<OrderView[]>(
        `/api/orders?${params.toString()}`,
      );
      setOrders(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [cashierId, date, paymentMethod, orderType]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createOrder = React.useCallback(
    async (input: CreateOrderInput): Promise<OrderView> => {
      const order = await request<OrderView>(`/api/orders`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
      return order;
    },
    [refresh],
  );

  const editOwnOrder = React.useCallback(
    async (id: string, input: EditOwnOrderInput): Promise<OrderView> => {
      const order = await request<OrderView>(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await refresh();
      return order;
    },
    [refresh],
  );

  /**
   * Admin-only at the API (A3, 6d) — exposed here so A3 can reuse this
   * hook. A Cashier calling it gets a `FORBIDDEN` from the route.
   */
  const correctOrder = React.useCallback(
    async (id: string, input: CorrectOrderInput): Promise<OrderView> => {
      const order = await request<OrderView>(`/api/orders/${id}/correct`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
      return order;
    },
    [refresh],
  );

  return { orders, loading, error, refresh, createOrder, editOwnOrder, correctOrder };
}

/** One order by id — C4's own load lifecycle (a different page from C1). */
export function useOrder(id: string | null) {
  const { orders, refresh: refreshList } = useOrders({});
  const [order, setOrder] = React.useState<OrderView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // No `GET /api/orders/:id` route in M2 — the list is the source.
      // A Cashier's list is their own orders; find the row by id.
      const rows = await request<OrderView[]>(`/api/orders?`);
      const found = rows.find((o) => o.id === id) ?? null;
      setOrder(found);
      if (!found) setError("Order not found.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const editOwnOrder = React.useCallback(
    async (input: EditOwnOrderInput): Promise<OrderView> => {
      if (!id) throw new Error("No order id.");
      const updated = await request<OrderView>(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await refresh();
      await refreshList();
      return updated;
    },
    [id, refresh, refreshList],
  );

  // `correction` is the append-only row that points back at this order,
  // if one exists in the caller's visible list (C4 walkthrough G).
  const correction = React.useMemo(
    () => orders.find((o) => o.correctsOrderId === id) ?? null,
    [orders, id],
  );

  return { order, correction, loading, error, refresh, editOwnOrder };
}
