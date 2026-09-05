"use client";

import * as React from "react";
import type {
  AccountBalancesView,
  MoneyAccount,
  OpeningBalanceState,
  OpeningBalanceView,
} from "@/lib/domain/financials";

/**
 * Data for `/admin/financials/opening` (ADR-70) — the Admin's stated Day-1
 * cash / M-Pesa position.
 *
 * Two reads, deliberately kept distinct:
 *
 *   - `state`    — the OPENING figures (`GET /api/financials/opening-balance`).
 *   - `balances` — TODAY'S live balances (`GET /api/money/balances`).
 *
 * The screen shows both side by side. They are different numbers, and
 * seeing them together is the main thing stopping the Admin from typing
 * today's cash into a Day-1 field.
 *
 * Follows `use-financials.ts` — a typed `request<T>`, an error carrying the
 * API `code`, money as decimal **strings** end to end.
 */

export type ApiError = { code: string; message: string; field?: string };

export class OpeningBalanceRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "OpeningBalanceRequestError";
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
    throw new OpeningBalanceRequestError(res.status, err);
  }
  return json.data;
}

export function useOpeningBalance() {
  const [state, setState] = React.useState<OpeningBalanceState | null>(null);
  const [balances, setBalances] = React.useState<AccountBalancesView | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [opening, live] = await Promise.all([
        request<OpeningBalanceState>("/api/financials/opening-balance"),
        request<AccountBalancesView>("/api/money/balances"),
      ]);
      setState(opening);
      setBalances(live);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load opening balances.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * State (or restate) ONE account. No date argument — the server pins the
   * business date, which is the whole point of ADR-70.
   */
  const save = React.useCallback(
    async (account: MoneyAccount, amount: string, note?: string) => {
      const view = await request<OpeningBalanceView>(
        "/api/financials/opening-balance",
        {
          method: "PUT",
          body: JSON.stringify({ account, amount, note }),
        },
      );
      await refresh();
      return view;
    },
    [refresh],
  );

  return { state, balances, loading, error, refresh, save };
}
