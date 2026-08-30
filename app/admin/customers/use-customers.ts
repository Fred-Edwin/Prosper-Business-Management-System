"use client";

import * as React from "react";
import type {
  CreateCustomerInput,
  Customer,
  CustomerLedger,
  CustomerListRow,
  MoneyAccount,
} from "@/lib/domain/customers";

/**
 * All Customers & Credit data-fetching lives here — C6 (Cashier mobile),
 * A1 (Admin register) and A2 (Admin detail) are pure presentation over
 * this hook. Mirrors `app/admin/catalog/use-catalog.ts` exactly (the
 * `request<T>` helper, a typed `*RequestError`, domain-typed shapes,
 * `refresh()`).
 *
 * Money crosses the boundary as decimal **strings** — the hook never
 * parses to `number`; screens format with their local helpers.
 */

export type ApiError = { code: string; message: string; field?: string };

export class CustomersRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "CustomersRequestError";
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
    throw new CustomersRequestError(res.status, err);
  }
  return json.data;
}

export type CustomersListFilter = {
  search?: string;
  hasBalance?: boolean;
};

export type RecordRepaymentArgs = {
  customerId: string;
  /** Decimal string. */
  amount: string;
  account: MoneyAccount;
  note?: string;
};

export function useCustomers(filter: CustomersListFilter) {
  const [customers, setCustomers] = React.useState<CustomerListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { search, hasBalance } = filter;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search && search.trim() !== "") params.set("search", search.trim());
      if (hasBalance) params.set("hasBalance", "true");
      const rows = await request<CustomerListRow[]>(
        `/api/customers?${params.toString()}`,
      );
      setCustomers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [search, hasBalance]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCustomer = React.useCallback(
    async (input: CreateCustomerInput): Promise<Customer> => {
      const created = await request<Customer>(`/api/customers`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
      return created;
    },
    [refresh],
  );

  const recordRepayment = React.useCallback(
    async ({ customerId, amount, account, note }: RecordRepaymentArgs) => {
      await request<unknown>(`/api/customers/${customerId}/repayments`, {
        method: "POST",
        body: JSON.stringify({ amount, account, note }),
      });
      await refresh();
    },
    [refresh],
  );

  return {
    customers,
    loading,
    error,
    refresh,
    createCustomer,
    recordRepayment,
  };
}

/**
 * One customer's interleaved debt/repayment ledger (A2). Separate hook —
 * a different endpoint, a different page, its own load lifecycle.
 */
export function useCustomerLedger(customerId: string | null) {
  const [ledger, setLedger] = React.useState<CustomerLedger | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      setLedger(await request<CustomerLedger>(`/api/customers/${customerId}`));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the customer ledger.",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordRepayment = React.useCallback(
    async ({ customerId: id, amount, account, note }: RecordRepaymentArgs) => {
      await request<unknown>(`/api/customers/${id}/repayments`, {
        method: "POST",
        body: JSON.stringify({ amount, account, note }),
      });
      await refresh();
    },
    [refresh],
  );

  return { ledger, loading, error, refresh, recordRepayment };
}
