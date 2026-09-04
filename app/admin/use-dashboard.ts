"use client";

import * as React from "react";
import type { DashboardView } from "@/lib/domain/dashboard";

/**
 * Data path for the `/admin` morning-triage dashboard (M5 S14). One
 * read: `GET /api/admin/dashboard` (Admin-only, ~21ms). Same shape as
 * `use-day-close.ts` / `use-financials.ts` — a typed request error + a
 * `request<T>` that unwraps `{ data }` / throws on `{ error }`, plus a
 * `refresh()`.
 *
 * The dashboard has NO period picker: every figure the endpoint returns
 * is "now" / "today" / "this week so far". Money crosses the boundary as
 * decimal strings — the screen formats for display with local helpers,
 * never `Number()`-es for a domain call.
 */

export type ApiError = { code: string; message: string; field?: string };

export class DashboardRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "DashboardRequestError";
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
    throw new DashboardRequestError(res.status, err);
  }
  return json.data;
}

export function useDashboard() {
  const [data, setData] = React.useState<DashboardView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await request<DashboardView>("/api/admin/dashboard"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
