import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  DomainError,
  getAccountBalances,
  serialiseAccountBalances,
} from "@/lib/domain/financials";

/**
 * `GET /api/money/balances` — the derived Cash-at-hand and M-Pesa/Bank
 * balances (ADR-17: `SUM(MoneyMovement.amount)` grouped by account, no
 * stored total). **Admin only** — M2 has no required screen for this; it
 * exists so QA and the owner walkthrough can eyeball the ledger.
 * `{ data: { cash, mpesaBank } }`, both decimal strings.
 */
export async function GET() {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  try {
    return ok(serialiseAccountBalances(await getAccountBalances()));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
