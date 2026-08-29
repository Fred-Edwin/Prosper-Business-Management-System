import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AccountBalances, MoneyReadContext } from "./types";
import { moneyString } from "./internal";

/**
 * The derived Cash-at-hand and M-Pesa/Bank balances (ADR-17). There is no
 * stored total anywhere — this is `SUM(MoneyMovement.amount)` grouped by
 * `account` over **every** row (amounts are signed, so no per-row sign
 * logic). One grouped aggregate query, never per-row JS.
 *
 * `Prisma.Decimal` in, `Prisma.Decimal` out; the route stringifies via
 * `serialiseAccountBalances`.
 *
 * A correction (ADR-15) will be a normal signed row like any other, so it
 * folds into this sum with no special handling — same property the stock
 * ledger relies on.
 */
export async function getAccountBalances(
  ctx?: MoneyReadContext,
): Promise<AccountBalances> {
  const where =
    ctx?.asOf != null ? { occurredAt: { lte: ctx.asOf } } : undefined;

  const grouped = await prisma.moneyMovement.groupBy({
    by: ["account"],
    _sum: { amount: true },
    where,
  });

  const byAccount = new Map(
    grouped.map((g) => [g.account, g._sum.amount ?? new Prisma.Decimal(0)]),
  );

  return {
    cash: byAccount.get("cash") ?? new Prisma.Decimal(0),
    mpesaBank: byAccount.get("mpesa_bank") ?? new Prisma.Decimal(0),
  };
}

/** Domain `AccountBalances` → wire shape (decimal strings). */
export function serialiseAccountBalances(balances: AccountBalances) {
  return {
    cash: moneyString(balances.cash),
    mpesaBank: moneyString(balances.mpesaBank),
  };
}
