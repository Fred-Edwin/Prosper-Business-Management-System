"use client";

// M4 S9B — all data fetching for /admin/staff (roster, attendance, pay,
// payout, handover shortfalls). Mirrors app/admin/financials/use-financials.ts:
// a typed `request<T>` helper, a `StaffRequestError` carrying the API
// `code` + `field`, domain-typed shapes, per-feature `refresh()`.
//
// Money crosses the boundary as decimal STRINGS — never `Number()`-ed for
// a domain call; the screens format for display with local helpers.

import * as React from "react";
import type {
  MonthlyShortfalls,
  PayrollSummary,
  StaffPay,
  StaffView,
} from "@/lib/domain/staff";
import type {
  CreateStaffBody,
  UpdateStaffBody,
} from "@/lib/validation/staff";

export type ApiError = { code: string; message: string; field?: string };

export class StaffRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "StaffRequestError";
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
    throw new StaffRequestError(res.status, err);
  }
  return json.data;
}

// ── Locations (for the drawer pickers + the location PillFilter) ───────

export type LocationOption = { id: string; name: string; type: string };

export function useLocations() {
  const [locations, setLocations] = React.useState<LocationOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const rows = await request<LocationOption[]>(`/api/locations`);
        if (alive) setLocations(rows);
      } catch {
        if (alive) setLocations([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { locations, loading };
}

// ── Roster ───────────────────────────────────────────────────────────

export function useRoster(locationId: string | null) {
  const [staff, setStaff] = React.useState<StaffView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
      setStaff(await request<StaffView[]>(`/api/staff${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (body: CreateStaffBody): Promise<StaffView> => {
      const row = await request<StaffView>(`/api/staff`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  const update = React.useCallback(
    async (id: string, body: UpdateStaffBody): Promise<StaffView> => {
      const row = await request<StaffView>(`/api/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  const deactivate = React.useCallback(
    async (id: string): Promise<StaffView> => {
      const row = await request<StaffView>(`/api/staff/${id}?mode=deactivate`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  return { staff, loading, error, refresh, create, update, deactivate };
}

// ── Attendance ───────────────────────────────────────────────────────

export type AttendanceRow = { staffId: string; date: string; present: boolean };

/**
 * Attendance for ONE date. The screen renders every active staff member;
 * a missing row means PRESENT (PRD §4.8) — so this hook only carries the
 * explicit rows and the screen defaults the rest.
 */
export function useAttendance(date: string) {
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await request<AttendanceRow[]>(
          `/api/attendance?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Bulk-set one date for many staff — how the screen saves a day. */
  const saveBulk = React.useCallback(
    async (
      entries: { staffId: string; present: boolean }[],
    ): Promise<AttendanceRow[]> => {
      const saved = await request<AttendanceRow[]>(
        `/api/attendance?mode=bulk`,
        { method: "POST", body: JSON.stringify({ date, entries }) },
      );
      await refresh();
      return saved;
    },
    [date, refresh],
  );

  return { rows, loading, error, refresh, saveBulk };
}

// ── Pay & advances ───────────────────────────────────────────────────

export type PayAdjustmentBody = {
  staffId: string;
  type: "advance" | "deduction";
  amount: string;
  date: string;
  note?: string;
};

export function usePayroll(month: string) {
  const [payroll, setPayroll] = React.useState<PayrollSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayroll(
        await request<PayrollSummary>(
          `/api/pay?month=${encodeURIComponent(month)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordAdjustment = React.useCallback(
    async (body: PayAdjustmentBody): Promise<void> => {
      await request(`/api/pay`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
    },
    [refresh],
  );

  /** Pay ONE staff member for the month. Server recomputes the amount. */
  const payOne = React.useCallback(
    async (body: {
      staffId: string;
      month: string;
      paidFromAccount: "cash" | "mpesa_bank";
      date: string;
    }): Promise<StaffPay> => {
      const res = await request<StaffPay>(`/api/pay/payout`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
      return res;
    },
    [refresh],
  );

  /** Pay every unpaid active staff member for the month. */
  const payAll = React.useCallback(
    async (body: {
      month: string;
      paidFromAccount: "cash" | "mpesa_bank";
      date: string;
    }): Promise<{
      month: string;
      paid: unknown[];
      skipped: { staffId: string; staffName: string; reason: string }[];
    }> => {
      const res = await request<{
        month: string;
        paid: unknown[];
        skipped: { staffId: string; staffName: string; reason: string }[];
      }>(`/api/pay/payout?mode=all`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
      return res;
    },
    [refresh],
  );

  return { payroll, loading, error, refresh, recordAdjustment, payOne, payAll };
}

// ── Handover shortfalls (READ-ONLY, never part of pay) ────────────────

export function useMonthlyShortfalls(month: string) {
  const [shortfalls, setShortfalls] = React.useState<MonthlyShortfalls | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setShortfalls(
        await request<MonthlyShortfalls>(
          `/api/pay/shortfalls?month=${encodeURIComponent(month)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shortfalls.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { shortfalls, loading, error, refresh };
}
