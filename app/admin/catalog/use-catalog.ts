"use client";

import * as React from "react";
import type {
  CreateProductInput,
  Location,
  ProductWithLocations,
  UpdateProductInput,
} from "@/lib/domain/catalog";

/**
 * All Catalog data-fetching lives here — the page/drawer/dialog are pure
 * presentation over this hook. Mirrors the domain types so the wired
 * screens and the API speak the same shapes.
 */

export type ApiError = { code: string; message: string; field?: string };

export class CatalogRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "CatalogRequestError";
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
    throw new CatalogRequestError(res.status, err);
  }
  return json.data;
}

export type CatalogListFilter = {
  kind?: "ingredient" | "dish" | "goods";
  search?: string;
  includeArchived?: boolean;
  /** Restrict to products assigned (active ProductLocation) to this location. */
  locationId?: string;
};

export function useCatalog(filter: CatalogListFilter) {
  const [products, setProducts] = React.useState<ProductWithLocations[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { kind, search, includeArchived, locationId } = filter;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (kind) params.set("kind", kind);
      if (search && search.trim() !== "") params.set("search", search.trim());
      if (includeArchived) params.set("includeArchived", "true");
      if (locationId && locationId.trim() !== "")
        params.set("locationId", locationId.trim());

      const [prods, locs] = await Promise.all([
        request<ProductWithLocations[]>(`/api/products?${params.toString()}`),
        request<Location[]>(`/api/locations`),
      ]);
      setProducts(prods);
      setLocations(locs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the catalog.");
    } finally {
      setLoading(false);
    }
  }, [kind, search, includeArchived, locationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (input: CreateProductInput) => {
      await request<ProductWithLocations>(`/api/products`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
    },
    [refresh],
  );

  const update = React.useCallback(
    async (id: string, input: UpdateProductInput) => {
      await request<ProductWithLocations>(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await refresh();
    },
    [refresh],
  );

  const archive = React.useCallback(
    async (id: string) => {
      await request<{ archived: true }>(`/api/products/${id}?mode=archive`, {
        method: "DELETE",
      });
      await refresh();
    },
    [refresh],
  );

  const hardDelete = React.useCallback(
    async (id: string, confirmName: string) => {
      await request<{ deleted: true }>(`/api/products/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmName }),
      });
      await refresh();
    },
    [refresh],
  );

  // A5 (ADR-47 §4) — mirror of `?mode=archive`. Admin only, idempotent,
  // clears `deletedAt`; does NOT auto-reactivate ProductLocation rows.
  const unarchive = React.useCallback(
    async (id: string) => {
      await request<{ archived: false }>(`/api/products/${id}?mode=unarchive`, {
        method: "POST",
      });
      await refresh();
    },
    [refresh],
  );

  return {
    products,
    locations,
    loading,
    error,
    refresh,
    create,
    update,
    archive,
    hardDelete,
    unarchive,
  };
}
