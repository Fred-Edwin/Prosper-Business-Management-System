"use client";

import * as React from "react";
import type { SaleAdjustmentView } from "@/lib/domain/sales";

/**
 * Owner sale adjustments (ADR-92) for the Admin Sales screen — the
 * Adjustments tab and the KPI strip's fold-in. Same `request<T>` /
 * `refresh()` shape as `app/canteen/use-stock-count.ts`'s
 * `useDerivedSales`. Money + quantities stay decimal strings.
 */

type ApiError = { code: string; message: string; field?: string };

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  const json = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: ApiError }
    | null;
  if (!res.ok || !json || "error" in json) {
    throw new Error(
      json && "error" in json ? json.error.message : "Failed to load sale adjustments.",
    );
  }
  return json.data;
}

export function useSaleAdjustments({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = React.useState<SaleAdjustmentView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      setRows(
        await request<SaleAdjustmentView[]>(
          `/api/stock-movements/adjust-sold?${params.toString()}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sale adjustments.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
