"use client";

// Staff-side handover data-fetching (Cashier + Canteen Attendant). The
// Admin reconciliation tab has its own hook in app/admin/financials —
// this one is scoped to "my own declarations": GET /api/handovers
// (role-scoped to the caller), POST /api/handovers (declare), PATCH
// /api/handovers/:id (edit own).
//
// Mirrors app/cashier/use-orders.ts — `request<T>`, a typed error with
// the API `code`, domain-typed shapes. Money crosses as decimal strings.

import * as React from "react";
import type {
  DeclareHandoverInput,
  EditOwnHandoverInput,
  HandoverView,
} from "@/lib/domain/handovers";

export type ApiError = { code: string; message: string; field?: string };

export class HandoverRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "HandoverRequestError";
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
    throw new HandoverRequestError(res.status, err);
  }
  return json.data;
}

/** Africa/Nairobi business date as `YYYY-MM-DD` (ADR-29). */
export function nairobiBusinessDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function useMyHandover() {
  const [handovers, setHandovers] = React.useState<HandoverView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

  const today = nairobiBusinessDate();

  // The API list excludes correction rows, so at most one row per staff
  // member falls on today — that's the editable declaration.
  const todaysHandover = React.useMemo(
    () =>
      handovers.find(
        (h) => nairobiBusinessDate(new Date(h.occurredAt)) === today,
      ) ?? null,
    [handovers, today],
  );

  const history = React.useMemo(
    () => handovers.filter((h) => h.id !== todaysHandover?.id),
    [handovers, todaysHandover],
  );

  return {
    todaysHandover,
    history,
    loading,
    error,
    refresh,
    declare,
    editOwn,
  };
}
