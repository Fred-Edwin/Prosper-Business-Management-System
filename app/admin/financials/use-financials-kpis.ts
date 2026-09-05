"use client";

// M5 v2 Session C — the six KPI-strip tiles on /admin/financials, one per
// transaction tab (financials-screen.md "Structure (v2 — current)" §2).
//
// Why this is its own read and not "computed from what each tab already
// fetches" (the handoff's preferred shape): the strip shows all six tabs'
// figures AT ONCE, but only the ACTIVE tab is mounted — an inactive tab
// has fetched nothing to compute from. So the three tiles whose figures
// aren't already on the shared summary (Purchases / Deliveries /
// Handovers) are read here, using exactly the same `stockApi` calls the
// Purchases + Deliveries tab already makes, with no new endpoint.
//
// The other three tiles need NO read at all — Expenses, Owner Draws and
// Non-Sale totals all come off `getFinancialSummary`, which the shell
// already fetches (`consolidated.totalExpenses`,
// `consolidated.ownerDrawsForPeriod`, `nonSaleConsumption.total`). Their
// COUNTS are the one thing the summary can't give, so they're read from
// the same expense / owner-transaction endpoints their tabs use.

import * as React from "react";
import type { ExpenseView, OwnerTransactionView } from "@/lib/domain/financials";
import type { ReconciliationView } from "@/lib/domain/handovers";
import type { StockMovementView } from "@/lib/domain/stock";
import { stockApi } from "../stock/use-stock";

export type FinancialsKpis = {
  purchases: { total: number; count: number };
  /** `pending` = payments with no matching receipt yet (Awaiting delivery). */
  deliveries: { received: number; pending: number };
  /** `shortfalls` = staff rows whose declared ≠ received on the range's end day. */
  handovers: { declared: number; shortfalls: number };
  expenses: { count: number };
  ownerDraws: { count: number };
  nonSale: { count: number };
};

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  const body = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: { message: string } }
    | null;
  if (!res.ok || !body || "error" in body) {
    throw new Error(
      body && "error" in body ? body.error.message : "Request failed.",
    );
  }
  return body.data;
}

/**
 * Every figure the KPI strip shows, for the inclusive business-date range
 * `from`..`to` — all FLOWS (ADR-57), accumulating over the whole range.
 *
 * Handovers is the one exception in shape, not in semantics: handover
 * reconciliation is a single-DAY worksheet, so (exactly as the Handovers
 * tab itself does) the shortfall count reconciles the range's END day.
 */
export function useFinancialsKpis(from: string, to: string) {
  const [kpis, setKpis] = React.useState<FinancialsKpis | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    try {
      const [payments, receipts, outstanding, expenses, ownerTx, recon, nonSale] =
        await Promise.all([
          stockApi.listMovements({
            movementType: "purchase_payment",
            from,
            to,
          }),
          stockApi.listMovements({
            movementType: "purchase_receipt",
            from,
            to,
          }),
          stockApi.outstanding(),
          json<ExpenseView[]>(`/api/expenses?${q}`),
          json<OwnerTransactionView[]>(`/api/owner-transactions?${q}`),
          json<ReconciliationView>(
            `/api/handovers/reconciliation?date=${encodeURIComponent(to)}`,
          ),
          stockApi.listMovements({
            movementType: "non_sale_consumption",
            from,
            to,
          }),
        ]);

      const inRange = (m: StockMovementView) => {
        const d = m.occurredAt.slice(0, 10);
        return d >= from && d <= to;
      };

      setKpis({
        purchases: {
          total: payments.reduce(
            (s, p) => s + Number(p.purchaseTotalCost ?? 0),
            0,
          ),
          count: payments.length,
        },
        deliveries: {
          received: receipts.length,
          // `outstanding()` is an all-time read (it has no range filter) —
          // scope it to the selected range so the tile matches the tab.
          pending: outstanding.awaitingReceipt.filter(inRange).length,
        },
        handovers: {
          declared: recon.rows.length,
          shortfalls: recon.rows.filter(
            (r) =>
              Number(r.cashVariance ?? 0) < 0 ||
              Number(r.mpesaVariance ?? 0) < 0,
          ).length,
        },
        expenses: { count: expenses.length },
        ownerDraws: {
          count: ownerTx.filter((t) => t.type === "draw").length,
        },
        nonSale: { count: nonSale.length },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the summary.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { kpis, loading, error, refresh };
}
