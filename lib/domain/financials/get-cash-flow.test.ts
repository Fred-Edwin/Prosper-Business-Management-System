import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCashFlow } from "./get-cash-flow";
import { recordMoneyMovement } from "./record-money-movement";
import {
  cleanupFinancialsTestData,
  setupFinancialsTestData,
  type FinancialsTestCtx,
} from "./test-helpers";

/**
 * `getCashFlow` unifies `MoneyMovement` rows chronologically across both
 * accounts and adds a running balance seeded from the ADR-57 opening
 * balance. Rows are dated to a quiet stretch clear of the seed and sibling
 * suites (matching `asof-semantics.test.ts`'s convention) and matched back
 * by this suite's own `sourceId` prefix, since other parallel suites may
 * share the ledger.
 */

const SCOPE = "cash-flow";
const d = (iso: string) => new Date(iso);

describe("getCashFlow", () => {
  let ctx: FinancialsTestCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("rejects an invalid or inverted range", async () => {
    await expect(getCashFlow("not-a-date", "2026-05-11")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "from",
    });
    await expect(getCashFlow("2026-05-11", "2026-05-01")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "from",
    });
  });

  it("orders entries chronologically across accounts, scopes to the period, and carries a per-account running balance that reconciles opening to closing", async () => {
    const mk = (
      account: "cash" | "mpesa_bank",
      amount: string,
      occurredAt: string,
      n: number,
    ) =>
      recordMoneyMovement(
        {
          account,
          amount: new Prisma.Decimal(amount),
          sourceType: "repayment",
          sourceId: `${ctx.prefix}m${n}`,
          occurredAt: d(occurredAt),
        },
        { actorId: ctx.actorId },
      );

    // Before the period (2026-05-10..2026-05-11) — sets the opening balance.
    await mk("cash", "1000.00", "2026-05-09T09:00:00Z", 1);
    await mk("mpesa_bank", "500.00", "2026-05-09T09:00:00Z", 2);

    // Inside the period, inserted out of chronological order deliberately
    // (05-10T06:00 must sort before 05-10T08:00 despite being created second).
    await mk("cash", "400.00", "2026-05-10T08:00:00Z", 3);
    await mk("mpesa_bank", "300.00", "2026-05-10T06:00:00Z", 4);
    await mk("cash", "-150.00", "2026-05-11T10:00:00Z", 5);

    // After the period — must not appear.
    await mk("cash", "9999.00", "2026-05-12T09:00:00Z", 6);

    const from = "2026-05-10";
    const to = "2026-05-11";
    const report = await getCashFlow(from, to);

    const ownIds = new Set(
      (
        await prisma.moneyMovement.findMany({
          where: { sourceId: { startsWith: ctx.prefix } },
          select: { id: true },
        })
      ).map((r) => r.id),
    );
    const mine = report.entries.filter((e) => ownIds.has(e.id));

    // Scoped to the period: only the 3 in-range rows, pre/post excluded.
    expect(mine.map((e) => e.amount)).toEqual(["300.00", "400.00", "-150.00"]);

    // Chronological across accounts: 05-10T06:00 (mpesa) before 05-10T08:00
    // (cash) before 05-11T10:00 (cash) — NOT insertion order.
    expect(mine.map((e) => e.account)).toEqual([
      "mpesa_bank",
      "cash",
      "cash",
    ]);

    // Running balance walks this suite's own rows correctly, as a DELTA on
    // top of the shared opening balance (the shared ledger may carry other
    // suites' history too).
    const [mpesaEntry, firstCash, secondCash] = mine;
    expect(
      new Prisma.Decimal(mpesaEntry.runningBalance)
        .sub(report.openingBalances.mpesaBank)
        .toFixed(2),
    ).toBe("300.00");
    expect(
      new Prisma.Decimal(firstCash.runningBalance)
        .sub(report.openingBalances.cash)
        .toFixed(2),
    ).toBe("400.00");
    expect(
      new Prisma.Decimal(secondCash.runningBalance)
        .sub(firstCash.runningBalance)
        .toFixed(2),
    ).toBe("-150.00");

    // The post-period row is excluded from the whole report, not just this
    // suite's slice.
    expect(report.entries.some((e) => e.amount === "9999.00")).toBe(false);
  });
});
