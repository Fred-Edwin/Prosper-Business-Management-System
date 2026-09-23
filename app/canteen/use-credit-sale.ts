"use client";

import * as React from "react";
import type {
  RecordCanteenCreditSaleInput,
  RecordCanteenCreditSaleResult,
  CanteenCreditSaleListItem,
  ListCanteenCreditSalesFilter,
} from "@/lib/domain/sales";
import { StockCountRequestError } from "./use-stock-count";

/**
 * Canteen credit-sale data-fetching (ADR-91) — mirrors `use-stock-count.ts`'s
 * shape exactly: the `request<T>` helper (reused via `StockCountRequestError`,
 * same wire error shape across every canteen route), a typed error class,
 * one-shot mutation hooks + a listing hook with `refresh()`.
 */

export { StockCountRequestError as CreditSaleRequestError };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: { code: string; message: string; field?: string } }
    | null;

  if (!res.ok || !json || "error" in json) {
    const err =
      json && "error" in json
        ? json.error
        : { code: "INTERNAL_ERROR", message: "Request failed." };
    throw new StockCountRequestError(res.status, err);
  }
  return json.data;
}

// ── Record / Void ───────────────────────────────────────────────────────

export function useCreditSaleActions() {
  const recordCreditSale = React.useCallback(
    async (
      input: RecordCanteenCreditSaleInput,
    ): Promise<RecordCanteenCreditSaleResult> => {
      return request<RecordCanteenCreditSaleResult>(
        "/api/canteen/credit-sales",
        {
          method: "POST",
          body: JSON.stringify({
            productId: input.productId,
            customerId: input.customerId,
            quantity: input.quantity,
            ...(input.occurredAt
              ? { occurredAt: input.occurredAt.toISOString() }
              : {}),
          }),
        },
      );
    },
    [],
  );

  const voidCreditSale = React.useCallback(
    async (stockMovementId: string): Promise<void> => {
      await request<unknown>(`/api/canteen/credit-sales/${stockMovementId}`, {
        method: "DELETE",
      });
    },
    [],
  );

  return { recordCreditSale, voidCreditSale };
}

// ── Today's credit sales (hub recap) ────────────────────────────────────

export function useCreditSales(filter: ListCanteenCreditSalesFilter = {}) {
  const [rows, setRows] = React.useState<CanteenCreditSaleListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { date } = filter;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      const data = await request<CanteenCreditSaleListItem[]>(
        `/api/canteen/credit-sales?${params.toString()}`,
      );
      setRows(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load credit sales.",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
