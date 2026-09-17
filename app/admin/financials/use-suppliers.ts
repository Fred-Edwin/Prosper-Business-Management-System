"use client";

import * as React from "react";
import type { Supplier } from "@/lib/domain/suppliers";

/**
 * Suppliers & Vendors data-fetching — shared by the purchase-payment drawer
 * (Stock/Financials) and the expense form's supplier dropdown. Suppliers is
 * a small, admin-only lookup list (no pagination, no filters beyond active
 * vs. archived), so one hook covers every caller.
 */

export type ApiError = { code: string; message: string; field?: string };

export class SuppliersRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "SuppliersRequestError";
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
    throw new SuppliersRequestError(res.status, err);
  }
  return json.data;
}

export const suppliersApi = {
  list: (search?: string) => {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    const qs = sp.toString();
    return request<Supplier[]>(`/api/suppliers${qs ? `?${qs}` : ""}`);
  },
  create: (input: { name: string; phone?: string; note?: string }) =>
    request<Supplier>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

/** Loads the active supplier list once on mount; `addLocal` appends a
 * freshly created supplier without a full refetch (used right after the
 * inline "+ Add supplier" flow creates one). */
export function useSuppliers() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setSuppliers(await suppliersApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const addLocal = React.useCallback((supplier: Supplier) => {
    setSuppliers((prev) =>
      [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  return { suppliers, loading, refresh, addLocal };
}
