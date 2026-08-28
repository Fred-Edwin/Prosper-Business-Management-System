"use client";

import * as React from "react";
import type {
  AssetCondition,
  AssetView,
  CreateAssetInput,
  UpdateAssetInput,
} from "@/lib/domain/assets";
import type { Location } from "@/lib/domain/catalog";

/**
 * All Admin Assets data-fetching lives here — the register / drawer / delete
 * dialog are pure presentation over this hook. Mirrors the `lib/domain/assets`
 * wire types so the wired screens and the API speak the same shapes.
 *
 * Same shape as Session 5's `use-catalog.ts` / Session 7's `use-stock.ts`
 * (a typed request error + a `request<T>` that unwraps `{ data }` / throws
 * on `{ error }`).
 */

export type ApiError = { code: string; message: string; field?: string };

export class AssetRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "AssetRequestError";
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
    throw new AssetRequestError(res.status, err);
  }
  return json.data;
}

export type AssetsListFilter = {
  search?: string;
  locationId?: string;
  condition?: AssetCondition;
  includeDeleted?: boolean;
};

// ── Low-level API calls (no React state) ────────────────────────────────

export const assetApi = {
  listAssets(filter: AssetsListFilter): Promise<AssetView[]> {
    const params = new URLSearchParams();
    if (filter.search && filter.search.trim() !== "")
      params.set("search", filter.search.trim());
    if (filter.locationId) params.set("locationId", filter.locationId);
    if (filter.condition) params.set("condition", filter.condition);
    if (filter.includeDeleted) params.set("includeDeleted", "true");
    return request<AssetView[]>(`/api/assets?${params.toString()}`);
  },

  createAsset(input: CreateAssetInput): Promise<AssetView> {
    return request<AssetView>(`/api/assets`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateAsset(id: string, input: UpdateAssetInput): Promise<AssetView> {
    return request<AssetView>(`/api/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  transitionCondition(id: string, condition: AssetCondition): Promise<AssetView> {
    return request<AssetView>(`/api/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ condition }),
    });
  },

  softDelete(id: string): Promise<{ softDeleted: true }> {
    return request<{ softDeleted: true }>(`/api/assets/${id}/soft-delete`, {
      method: "POST",
    });
  },

  hardDelete(id: string, confirmName: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/api/assets/${id}/hard-delete`, {
      method: "POST",
      body: JSON.stringify({ confirmName }),
    });
  },

  listLocations(): Promise<Location[]> {
    return request<Location[]>(`/api/locations`);
  },
};

// ── Hook: the register's data path ─────────────────────────────────────

export function useAssets(filter: AssetsListFilter) {
  const [assets, setAssets] = React.useState<AssetView[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { search, locationId, condition, includeDeleted } = filter;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, locs] = await Promise.all([
        assetApi.listAssets({ search, locationId, condition, includeDeleted }),
        assetApi.listLocations(),
      ]);
      setAssets(rows);
      setLocations(locs);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the asset register.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, locationId, condition, includeDeleted]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (input: CreateAssetInput) => {
      await assetApi.createAsset(input);
      await refresh();
    },
    [refresh],
  );

  const update = React.useCallback(
    async (id: string, input: UpdateAssetInput) => {
      await assetApi.updateAsset(id, input);
      await refresh();
    },
    [refresh],
  );

  const softDelete = React.useCallback(
    async (id: string) => {
      await assetApi.softDelete(id);
      await refresh();
    },
    [refresh],
  );

  const hardDelete = React.useCallback(
    async (id: string, confirmName: string) => {
      await assetApi.hardDelete(id, confirmName);
      await refresh();
    },
    [refresh],
  );

  return {
    assets,
    locations,
    loading,
    error,
    refresh,
    create,
    update,
    softDelete,
    hardDelete,
  };
}
