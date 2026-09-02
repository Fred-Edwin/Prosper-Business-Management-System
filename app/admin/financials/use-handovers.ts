"use client";

import * as React from "react";
import type {
  DeclareHandoverInput,
  EditOwnHandoverInput,
  HandoverView,
  ReconciliationView,
} from "@/lib/domain/handovers";

/**
 * All Handover data-fetching. Mirrors `app/cashier/use-orders.ts` — the
 * `request<T>` helper, a typed `HandoversRequestError` carrying the API
 * `code` + `field`, domain-typed shapes, `refresh()`.
 *
 *   • useReconciliation(date)  — Admin reconciliation tab
 *       (GET /api/handovers/reconciliation?date=)
 *   • useMyHandover()          — a staff member's own declarations
 *       (GET /api/handovers) + declare / edit
 *
 * Money crosses the boundary as decimal **strings** — never Number()-ed
 * for a domain call; screens format for display with local helpers only.
 */

export type ApiError = { code: string; message: string; field?: string };

export class HandoversRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "HandoversRequestError";
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
    throw new HandoversRequestError(res.status, err);
  }
  return json.data;
}

const NAIROBI_TZ = "Africa/Nairobi";

/** Africa/Nairobi business date as `YYYY-MM-DD` (ADR-29 boundary). */
export function nairobiBusinessDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

// ── Admin: reconciliation ───────────────────────────────────────────────

export type RecordReceiptArgs = {
  cashReceived: string;
  mpesaReceived: string;
  shortfallNote?: string;
};

export type CorrectionArgs =
  | { target: "handover"; cashDeclared: string; mpesaDeclared: string }
  | {
      target: "receipt";
      receiptId: string;
      cashReceived: string;
      mpesaReceived: string;
      shortfallNote?: string;
    };

export function useReconciliation(date: string) {
  const [data, setData] = React.useState<ReconciliationView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const view = await request<ReconciliationView>(
        `/api/handovers/reconciliation?date=${encodeURIComponent(date)}`,
      );
      setData(view);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the reconciliation.",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordReceipt = React.useCallback(
    async (handoverId: string, args: RecordReceiptArgs): Promise<HandoverView> => {
      const view = await request<HandoverView>(
        `/api/handovers/${handoverId}/receive`,
        { method: "POST", body: JSON.stringify(args) },
      );
      await refresh();
      return view;
    },
    [refresh],
  );

  const correct = React.useCallback(
    async (handoverId: string, args: CorrectionArgs): Promise<HandoverView> => {
      const view = await request<HandoverView>(
        `/api/handovers/${handoverId}/correct`,
        { method: "POST", body: JSON.stringify(args) },
      );
      await refresh();
      return view;
    },
    [refresh],
  );

  return { data, loading, error, refresh, recordReceipt, correct };
}

// ── Staff: my own declarations ─────────────────────────────────────────

export function useMyHandovers() {
  const [handovers, setHandovers] = React.useState<HandoverView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // No `date` filter — the staff screen shows today's declaration to
      // edit AND the full own-history list below it.
      const rows = await request<HandoverView[]>(`/api/handovers`);
      setHandovers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your handovers.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const declare = React.useCallback(
    async (input: DeclareHandoverInput): Promise<HandoverView> => {
      const view = await request<HandoverView>(`/api/handovers`, {
        method: "POST",
        body: JSON.stringify({
          cashDeclared: input.cashDeclared,
          mpesaDeclared: input.mpesaDeclared,
        }),
      });
      await refresh();
      return view;
    },
    [refresh],
  );

  const editOwn = React.useCallback(
    async (id: string, input: EditOwnHandoverInput): Promise<HandoverView> => {
      const view = await request<HandoverView>(`/api/handovers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await refresh();
      return view;
    },
    [refresh],
  );

  // Today's declaration (if any) — the one the staff form edits. A
  // correction row (`correctsHandoverId` set) is excluded by the API list,
  // so at most one row per staff member falls on today.
  const today = nairobiBusinessDate();
  const todaysHandover = React.useMemo(
    () =>
      handovers.find(
        (h) => nairobiBusinessDate(new Date(h.occurredAt)) === today,
      ) ?? null,
    [handovers, today],
  );

  // History = everything that isn't today's editable declaration.
  const history = React.useMemo(
    () => handovers.filter((h) => h.id !== todaysHandover?.id),
    [handovers, todaysHandover],
  );

  return {
    handovers,
    todaysHandover,
    history,
    loading,
    error,
    refresh,
    declare,
    editOwn,
  };
}
