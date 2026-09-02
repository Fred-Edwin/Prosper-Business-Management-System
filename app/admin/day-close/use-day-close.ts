"use client";

import * as React from "react";
import type { DayCloseView, DayStatusView } from "@/lib/domain/audit";

/**
 * Data path for the Admin Dashboard's Day Close card (M3-S1 / ADR-52).
 * Same shape as `use-assets.ts` / `use-catalog.ts` — a typed request error
 * + a `request<T>` that unwraps `{ data }` / throws on `{ error }`.
 */

export type ApiError = { code: string; message: string; field?: string };

export class DayCloseRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "DayCloseRequestError";
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
    throw new DayCloseRequestError(res.status, err);
  }
  return json.data;
}

type DayCloseResponse = { today: DayStatusView; recent: DayCloseView[] };

export function useDayClose() {
  const [today, setToday] = React.useState<DayStatusView | null>(null);
  const [recent, setRecent] = React.useState<DayCloseView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<DayCloseResponse>("/api/day-close");
      setToday(data.today);
      setRecent(data.recent);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load Day Close status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const close = React.useCallback(
    async (date: string) => {
      await request<DayCloseView>("/api/day-close", {
        method: "POST",
        body: JSON.stringify({ date }),
      });
      await refresh();
    },
    [refresh],
  );

  const reopen = React.useCallback(
    async (date: string) => {
      await request<{ date: string; reopened: true }>("/api/day-close", {
        method: "DELETE",
        body: JSON.stringify({ date }),
      });
      await refresh();
    },
    [refresh],
  );

  return { today, recent, loading, error, refresh, close, reopen };
}
