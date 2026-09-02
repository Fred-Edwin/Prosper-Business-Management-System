"use client";

import * as React from "react";
import type {
  ExpenseView,
  FinancialSummary,
  OwnerTransactionView,
  RecordExpenseInput,
  RecordOwnerTransactionInput,
} from "@/lib/domain/financials";

/**
 * All Financials (expenses / owner transactions / profit summary) data
 * fetching for `/admin/financials`. Mirrors `use-handovers.ts` — a typed
 * `request<T>` helper, a `FinancialsRequestError` carrying the API
 * `code` + `field`, domain-typed shapes, `refresh()`.
 *
 * Money crosses the boundary as decimal **strings** — never `Number()`-ed
 * for a domain call; the screens format for display with local helpers.
 */

export type ApiError = { code: string; message: string; field?: string };

export class FinancialsRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "FinancialsRequestError";
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
    throw new FinancialsRequestError(res.status, err);
  }
  return json.data;
}

// ── Expenses ──────────────────────────────────────────────────────────

export function useExpenses(date: string) {
  const [expenses, setExpenses] = React.useState<ExpenseView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await request<ExpenseView[]>(
        `/api/expenses?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`,
      );
      setExpenses(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (input: RecordExpenseInput): Promise<ExpenseView> => {
      const row = await request<ExpenseView>(`/api/expenses`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  const correct = React.useCallback(
    async (id: string, amount: string, note?: string): Promise<ExpenseView> => {
      const row = await request<ExpenseView>(`/api/expenses/${id}/correct`, {
        method: "POST",
        body: JSON.stringify({ amount, note }),
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  return { expenses, loading, error, refresh, create, correct };
}

// ── Owner transactions ────────────────────────────────────────────────

export function useOwnerTransactions(date: string) {
  const [transactions, setTransactions] = React.useState<OwnerTransactionView[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await request<OwnerTransactionView[]>(
        `/api/owner-transactions?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`,
      );
      setTransactions(rows);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load owner transactions.",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (input: RecordOwnerTransactionInput): Promise<OwnerTransactionView> => {
      const row = await request<OwnerTransactionView>(`/api/owner-transactions`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  return { transactions, loading, error, refresh, create };
}

// ── Financial summary (profit picture + KPI tiles) ────────────────────

/**
 * The summary for a single business date (`from === to === date`). Powers
 * both the KPI strip (running balances + the day's outflows) and the
 * profit section (revenue / COGS / gross / expenses / net, per location
 * and consolidated, plus the separate non-sale consumption figure).
 */
export function useFinancialSummary(date: string) {
  const [summary, setSummary] = React.useState<FinancialSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await request<FinancialSummary>(
        `/api/financials/summary?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`,
      );
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the summary.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
