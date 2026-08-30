"use client";

import * as React from "react";
import type {
  RecordStockCountInput,
  RecordStockCountResult,
  DerivedSaleView,
  ListDerivedSalesFilter,
} from "@/lib/domain/sales";

/**
 * All Canteen stock-count data-fetching lives here.
 * Mirrors `app/cashier/use-orders.ts` / `use-catalog.ts` exactly —
 * the `request<T>` helper, a typed `*RequestError`, `refresh()`.
 *
 * Consumed by:
 *   - K1 Stock Count (6d) — `recordStockCount`, `voidStockCount`
 *   - A4 Derived Sales (6d) — `listDerivedSales`
 *
 * Money + quantities cross the boundary as decimal **strings** — the
 * hook never `Number()`-parses them for the domain call; screens format
 * for display with local helpers only.
 */

export type ApiError = { code: string; message: string; field?: string };

export class StockCountRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "StockCountRequestError";
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
    throw new StockCountRequestError(res.status, err);
  }
  return json.data;
}

// ── Derived Sales list (A4) ────────────────────────────────────────────

export type DerivedSalesFilter = ListDerivedSalesFilter;

export function useDerivedSales(filter: DerivedSalesFilter = {}) {
  const [rows, setRows] = React.useState<DerivedSaleView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { productId, date } = filter;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (productId) params.set("productId", productId);
      if (date) params.set("date", date);
      const data = await request<DerivedSaleView[]>(
        `/api/canteen/stock-counts?${params.toString()}`,
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load derived sales.");
    } finally {
      setLoading(false);
    }
  }, [productId, date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

// ── Record / Void (K1) ────────────────────────────────────────────────

/**
 * One-shot mutations — not a hook that lists; K1 manages its own local
 * state. Both functions throw `StockCountRequestError` on failure so
 * the screen can surface inline error messages.
 */

export function useStockCountActions() {
  const recordStockCount = React.useCallback(
    async (
      input: RecordStockCountInput,
    ): Promise<RecordStockCountResult> => {
      return request<RecordStockCountResult>("/api/canteen/stock-counts", {
        method: "POST",
        body: JSON.stringify({
          productId: input.productId,
          countedQuantity: input.countedQuantity,
          ...(input.occurredAt
            ? { occurredAt: input.occurredAt.toISOString() }
            : {}),
        }),
      });
    },
    [],
  );

  const voidStockCount = React.useCallback(
    async (countId: string): Promise<void> => {
      await request<unknown>(`/api/canteen/stock-counts/${countId}`, {
        method: "DELETE",
      });
    },
    [],
  );

  return { recordStockCount, voidStockCount };
}
