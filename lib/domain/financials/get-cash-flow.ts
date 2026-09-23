import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addBusinessDays,
  businessDateEndUtc,
  businessDateLastInstantUtc,
  businessDateStartUtc,
} from "@/lib/time";
import { getAccountBalances } from "./get-account-balances";
import { assertRange, moneyString } from "./internal";
import type { CashFlowEntry, CashFlowReport } from "./types";

/**
 * The unified, chronological cash-flow history for a business-date range
 * (client feedback item #7 — a Cash Flow tab on `/admin/financials`
 * explaining the Dashboard's "Total Business Liquidity" figure). **Pure
 * report — nothing stored, nothing written.** Every row already exists as
 * a `MoneyMovement` (ADR-17); this reads them chronologically across both
 * accounts instead of split by transaction type, and adds a running
 * balance per account.
 *
 * **Flows vs. balances (ADR-57), same split `getFinancialSummary` uses:**
 *   - `entries` is the FLOW side — every `MoneyMovement` with
 *     `occurredAt` in `[start, end)`, oldest first.
 *   - `openingBalances` / `closingBalances` are BALANCES — a level at one
 *     instant, read via `getAccountBalances({ asOf })` exactly as the
 *     summary reads its position figures. Opening is "as of the end of
 *     the day before `from`" (the instant just before the period
 *     starts); closing is "as of the end of `to`" — the identical `asOf`
 *     `getFinancialSummary` computes for the same `to`.
 *
 * Reconciliation invariant per account: `opening + Σ(entries.amount)`
 * (that account's entries only) `=== closing`.
 */
export async function getCashFlow(
  from: string,
  to: string,
): Promise<CashFlowReport> {
  assertRange(from, to);

  const start = businessDateStartUtc(from);
  const end = businessDateEndUtc(to); // exclusive — for the entry list
  const openingAsOf = businessDateLastInstantUtc(addBusinessDays(from, -1));
  const closingAsOf = businessDateLastInstantUtc(to);

  const [openingBalances, closingBalances, rows] = await Promise.all([
    getAccountBalances({ asOf: openingAsOf }),
    getAccountBalances({ asOf: closingAsOf }),
    prisma.moneyMovement.findMany({
      where: { occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const running = new Map<string, Prisma.Decimal>([
    ["cash", openingBalances.cash],
    ["mpesa_bank", openingBalances.mpesaBank],
  ]);

  const entries: CashFlowEntry[] = rows.map((row) => {
    const next = (running.get(row.account) ?? new Prisma.Decimal(0)).add(
      row.amount,
    );
    running.set(row.account, next);
    return {
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      account: row.account,
      sourceType: row.sourceType,
      amount: moneyString(row.amount),
      runningBalance: moneyString(next),
      note: row.note,
    };
  });

  return {
    from,
    to,
    openingBalances: {
      cash: moneyString(openingBalances.cash),
      mpesaBank: moneyString(openingBalances.mpesaBank),
    },
    closingBalances: {
      cash: moneyString(closingBalances.cash),
      mpesaBank: moneyString(closingBalances.mpesaBank),
    },
    entries,
  };
}
