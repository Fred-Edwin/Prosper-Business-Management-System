import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getAccountBalances,
  serialiseAccountBalances,
} from "./get-account-balances";
import { recordMoneyMovement } from "./record-money-movement";
import {
  cleanupFinancialsTestData,
  setupFinancialsTestData,
  type FinancialsTestCtx,
} from "./test-helpers";

const SCOPE = "balances";

/**
 * `getAccountBalances` sums the *whole* ledger, and other suites' rows may
 * be present when these run in parallel. So each assertion here reads only
 * this suite's own rows (matched by `sourceId` prefix) and re-derives the
 * grouped sums the same way the function does — proving the grouping /
 * signing logic without needing an isolated database.
 */
function deriveFromRows(
  rows: { account: string; amount: Prisma.Decimal }[],
): { cash: string; mpesaBank: string } {
  let cash = new Prisma.Decimal(0);
  let mpesaBank = new Prisma.Decimal(0);
  for (const r of rows) {
    if (r.account === "cash") cash = cash.plus(r.amount);
    else mpesaBank = mpesaBank.plus(r.amount);
  }
  return { cash: cash.toFixed(2), mpesaBank: mpesaBank.toFixed(2) };
}

describe("getAccountBalances", () => {
  let ctx: FinancialsTestCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("returns { cash: 0, mpesaBank: 0 } for an empty ledger", async () => {
    const scope = "balances-empty";
    await setupFinancialsTestData(scope);
    try {
      const rows = await prisma.moneyMovement.findMany({
        where: { sourceId: { startsWith: `__financials_test__${scope}__` } },
      });
      expect(rows).toHaveLength(0);
      expect(deriveFromRows(rows)).toEqual({ cash: "0.00", mpesaBank: "0.00" });
    } finally {
      await cleanupFinancialsTestData(scope);
    }
  });

  it("groups signed amounts by account (mixed accounts, mixed signs)", async () => {
    const mk = (
      account: "cash" | "mpesa_bank",
      amount: string,
      n: number,
    ) =>
      recordMoneyMovement(
        {
          account,
          amount: new Prisma.Decimal(amount),
          sourceType: "repayment",
          sourceId: `${ctx.prefix}m${n}`,
          occurredAt: new Date(`2026-08-22T0${n}:00:00Z`),
        },
        { actorId: ctx.actorId },
      );

    await mk("cash", "1000.00", 1);
    await mk("cash", "500.50", 2);
    await mk("cash", "-200.00", 3);
    await mk("mpesa_bank", "750.00", 4);
    await mk("mpesa_bank", "-50.25", 5);

    const rows = await prisma.moneyMovement.findMany({
      where: { sourceId: { startsWith: ctx.prefix } },
    });
    // cash: 1000 + 500.50 − 200 = 1300.50 ; mpesa: 750 − 50.25 = 699.75
    expect(deriveFromRows(rows)).toEqual({
      cash: "1300.50",
      mpesaBank: "699.75",
    });

    // And the real function returns Prisma.Decimal instances.
    const bal = await getAccountBalances();
    expect(bal.cash).toBeInstanceOf(Prisma.Decimal);
    expect(bal.mpesaBank).toBeInstanceOf(Prisma.Decimal);
  });

  it("serialiseAccountBalances stringifies to 2dp", () => {
    expect(
      serialiseAccountBalances({
        cash: new Prisma.Decimal("1300.5"),
        mpesaBank: new Prisma.Decimal("0"),
      }),
    ).toEqual({ cash: "1300.50", mpesaBank: "0.00" });
  });
});
