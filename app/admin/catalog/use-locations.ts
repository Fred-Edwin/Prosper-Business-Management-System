"use client";

import * as React from "react";
import type {
  CreateLocationInput,
  Location,
  UpdateLocationInput,
} from "@/lib/domain/catalog";
import { CatalogRequestError, type ApiError } from "./use-catalog";

/**
 * Data-fetching for the /admin/catalog Locations tab — the sibling of
 * `useCatalog`, same request/error shape. Lists ALL locations (active +
 * inactive) via `?includeInactive=1` so the tab can show status and
 * re-activate a deactivated one.
 *
 * `deactivate` deliberately lets the domain's `CONFLICT` message through
 * unchanged (active staff / stock on hand / pending transfers) — the
 * screen surfaces that exact reason, per the session brief.
 */

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

export function useLocations() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLocations(
        await request<Location[]>(`/api/locations?includeInactive=1`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (input: CreateLocationInput) => {
      await request<Location>(`/api/locations`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
    },
    [refresh],
  );

  const update = React.useCallback(
    async (id: string, input: UpdateLocationInput) => {
      await request<Location>(`/api/locations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await refresh();
    },
    [refresh],
  );

  const deactivate = React.useCallback(
    async (id: string) => {
      await request<Location>(`/api/locations/${id}?mode=deactivate`, {
        method: "PATCH",
      });
      await refresh();
    },
    [refresh],
  );

  return { locations, loading, error, refresh, create, update, deactivate };
}
