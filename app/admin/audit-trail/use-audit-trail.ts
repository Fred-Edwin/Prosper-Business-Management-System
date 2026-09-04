"use client";

import * as React from "react";
import type { AuditAction } from "@prisma/client";
import type { AuditLogItem } from "@/lib/domain/audit";

/**
 * Data path for `/admin/audit-trail` (M5 S15). One read:
 * `GET /api/audit` (Admin-only, paginated by ITEM — a batch of rows
 * written in one transaction is one item; see ADR-65). Same shape as
 * `use-dashboard.ts` / `use-financials.ts` — a typed request error, a
 * `request<T>` that unwraps `{ data }` / throws on `{ error }`, and a
 * `refresh()`.
 *
 * The filter object is owned by the screen; this hook re-queries whenever
 * it changes. Money / timestamps cross the boundary as strings — the
 * screen formats for display with local helpers.
 */

export type ApiError = { code: string; message: string; field?: string };

export class AuditRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "AuditRequestError";
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
    throw new AuditRequestError(res.status, err);
  }
  return json.data;
}

export type AuditPage = {
  items: AuditLogItem[];
  actors: { id: string; name: string }[];
  page: { total: number; offset: number; limit: number; hasMore: boolean };
};

export type AuditFilter = {
  from?: string;
  to?: string;
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  /** `false` → "Show everything" is on (no significant-subset restriction). */
  significant: boolean;
  limit: number;
  offset: number;
};

function toQuery(f: AuditFilter): string {
  const q = new URLSearchParams();
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  if (f.actorId) q.set("actorId", f.actorId);
  if (f.action) q.set("action", f.action);
  if (f.entityType) q.set("entityType", f.entityType);
  if (f.significant) q.set("group", "significant");
  q.set("limit", String(f.limit));
  q.set("offset", String(f.offset));
  return q.toString();
}

export function useAuditTrail(filter: AuditFilter) {
  const [data, setData] = React.useState<AuditPage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const query = toQuery(filter);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await request<AuditPage>(`/api/audit?${query}`));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the audit trail.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
