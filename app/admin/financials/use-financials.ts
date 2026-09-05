"use client";

import * as React from "react";
import type {
  ExpenseView,
  FinancialSummary,
  OwnerTransactionView,
  RecordExpenseInput,
  RecordOwnerTransactionInput,
} from "@/lib/domain/financials";
import type { CustomerListRow } from "@/lib/domain/customers";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import type { StaffView } from "@/lib/domain/staff";
import type { StockMovementView } from "@/lib/domain/stock";
import { stockApi } from "../stock/use-stock";

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

/**
 * Expenses for a business-date RANGE (`from`..`to` inclusive). Expenses
 * are a FLOW (ADR-57) — they accumulate over the whole range the
 * /admin/financials control selects. `from === to` for a single day.
 */
export function useExpenses(from: string, to: string) {
  const [expenses, setExpenses] = React.useState<ExpenseView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await request<ExpenseView[]>(
        `/api/expenses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setExpenses(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

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

/**
 * Owner draws / returns for a business-date RANGE (`from`..`to`
 * inclusive) — a FLOW list (ADR-57). The running "owed to business"
 * balance comes separately from the summary (`consolidated.ownerOwedToBusiness`,
 * read as of the range's end date).
 */
export function useOwnerTransactions(from: string, to: string) {
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
        `/api/owner-transactions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setTransactions(rows);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load owner transactions.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);

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
 * The summary for a business-date RANGE (`from`..`to` inclusive). Powers
 * the always-on Profit panel: the KPI row (position balances + range
 * figures) and the Revenue → Net stack, per location and consolidated,
 * plus the separate non-sale consumption figure.
 *
 * The domain applies the ADR-57 split itself — FLOW figures (revenue,
 * COGS, gross/net, expenses, non-sale) accumulate over `from`..`to`;
 * BALANCE figures (cash, M-Pesa/bank, debts owed, owed by owner) are read
 * "as of the end of `to`".
 */
export function useFinancialSummary(from: string, to: string) {
  const [summary, setSummary] = React.useState<FinancialSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await request<FinancialSummary>(
        `/api/financials/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the summary.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}

// ── Debts card — customers who currently owe (v2) ──────────────────────

/**
 * The open-debt customers for the v2 Debts card — `GET
 * /api/customers?owingOnly=true` (Session A). A **BALANCE, as of now**
 * (ADR-57): deliberately NOT period-scoped, so this hook takes no range.
 * The server pre-sorts by `oldestDebtAt` ascending under `owingOnly`, so
 * the screen never re-sorts.
 *
 * The card's *total* does not come from here — it is
 * `consolidated.debtsOwedToBusiness` off the shared summary, which is
 * already the authoritative figure. These rows only answer "who".
 */
export function useOwingCustomers() {
  const [customers, setCustomers] = React.useState<CustomerListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(
        await request<CustomerListRow[]>(`/api/customers?owingOnly=true`),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load customer debts.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { customers, loading, error, refresh };
}

// ── Non-Sale Consumption tab (v2, 6th tab) ────────────────────────────

/**
 * Non-sale consumption rows for a business-date RANGE — a FLOW (ADR-57),
 * accumulating over the whole `from`..`to`. Pure read-wiring over the
 * already-shipped `GET /api/stock-movements?movementType=
 * non_sale_consumption&from=&to=` (no new backend — v2 spec).
 *
 * The raw movement rows carry `productId` / `locationId` / `recordedById`
 * but no resolved names, so the tab also pulls the product + location
 * lookups (the same `stockApi` reads every other transaction tab already
 * makes) and the staff roster, and joins client-side.
 */
export function useNonSaleConsumption(from: string, to: string) {
  const [movements, setMovements] = React.useState<StockMovementView[]>([]);
  const [products, setProducts] = React.useState<ProductWithLocations[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [staff, setStaff] = React.useState<StaffView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, prods, locs, people] = await Promise.all([
        stockApi.listMovements({
          movementType: "non_sale_consumption",
          from,
          to,
        }),
        stockApi.listProducts(),
        stockApi.listLocations(),
        request<StaffView[]>(`/api/staff`),
      ]);
      setMovements(rows);
      setProducts(prods);
      setLocations(locs);
      setStaff(people);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load non-sale consumption.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { movements, products, locations, staff, loading, error, refresh };
}
