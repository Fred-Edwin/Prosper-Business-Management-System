"use client";

import * as React from "react";

/**
 * v2 Dashboard Session B — the period trend zone's data path. One read:
 * `GET /api/admin/dashboard/trend?from=&to=` (Admin-only), a thin
 * exposure of `dailyNetSeries` (ADR-64) over the period control's exact
 * range. Distinct from `useDashboard`'s always-30-days `trend` band and
 * always-this-week `week` band — this follows whatever range the period
 * control resolves to (Today / This week / This month / Custom).
 *
 * Bucketing (daily vs. weekly) happens in the screen component, not
 * here — this hook only fetches the daily series; see
 * `bucketTrendByPeriod` in `dashboard-client.tsx`.
 */

export type ApiError = { code: string; message: string; field?: string };

export class DashboardTrendRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "DashboardTrendRequestError";
    this.code = err.code;
    this.field = err.field;
    this.status = status;
  }
}

export type DashboardTrendDayNet = { date: string; net: string };
export type DashboardTrendView = {
  from: string;
  to: string;
  dailyNet: DashboardTrendDayNet[];
};

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
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
    throw new DashboardTrendRequestError(res.status, err);
  }
  return json.data;
}

export function useDashboardTrend(from: string, to: string) {
  const [data, setData] = React.useState<DashboardTrendView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await request<DashboardTrendView>(
          `/api/admin/dashboard/trend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the trend.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
