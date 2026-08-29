import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "./record-money-movement";
import { getAccountBalances } from "./get-account-balances";
import {
  cleanupFinancialsTestData,
  setupFinancialsTestData,
  type FinancialsTestCtx,
} from "./test-helpers";

const SCOPE = "record";

describe("recordMoneyMovement", () => {
  let ctx: FinancialsTestCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("appends exactly one row with the given signed amount, plus an AuditLog row", async () => {
    const sourceId = `${ctx.prefix}src-1`;
    const row = await recordMoneyMovement(
      {
        account: "cash",
        amount: new Prisma.Decimal("1500.00"),
        sourceType: "repayment",
        sourceId,
        occurredAt: new Date("2026-08-20T09:00:00Z"),
      },
      { actorId: ctx.actorId },
    );

    const rows = await prisma.moneyMovement.findMany({ where: { sourceId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(row.id);
    expect(rows[0].account).toBe("cash");
    expect(rows[0].amount.toFixed(2)).toBe("1500.00");
    expect(rows[0].recordedById).toBe(ctx.actorId);

    const audit = await prisma.auditLog.findMany({
      where: { entityType: "money_movement", entityId: row.id },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("create");
    expect(audit[0].userId).toBe(ctx.actorId);
  });

  it("stores a negative amount for a money-out movement", async () => {
    const sourceId = `${ctx.prefix}src-out`;
    await recordMoneyMovement(
      {
        account: "mpesa_bank",
        amount: new Prisma.Decimal("-250.00"),
        sourceType: "expense",
        sourceId,
        occurredAt: new Date("2026-08-20T10:00:00Z"),
      },
      { actorId: ctx.actorId },
    );

    const [row] = await prisma.moneyMovement.findMany({ where: { sourceId } });
    expect(row.amount.toFixed(2)).toBe("-250.00");
  });

  it("persists nothing when called inside a tx that then rolls back", async () => {
    const sourceId = `${ctx.prefix}src-rollback`;

    await expect(
      prisma.$transaction(async (tx) => {
        await recordMoneyMovement(
          {
            account: "cash",
            amount: new Prisma.Decimal("999.00"),
            sourceType: "order",
            sourceId,
            occurredAt: new Date("2026-08-20T11:00:00Z"),
          },
          { actorId: ctx.actorId, tx },
        );
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    const rows = await prisma.moneyMovement.findMany({ where: { sourceId } });
    expect(rows).toHaveLength(0);
    const audit = await prisma.auditLog.findMany({
      where: { entityType: "money_movement", newValue: { path: ["sourceId"], equals: sourceId } },
    });
    expect(audit).toHaveLength(0);
  });

  it("keeps Decimal precision exact (0.10 + 0.20 = 0.30, no float drift)", async () => {
    const scope = "record-precision";
    const p = await setupFinancialsTestData(scope);
    try {
      await recordMoneyMovement(
        {
          account: "cash",
          amount: new Prisma.Decimal("0.10"),
          sourceType: "repayment",
          sourceId: `${p.prefix}a`,
          occurredAt: new Date("2026-08-21T09:00:00Z"),
        },
        { actorId: p.actorId },
      );
      await recordMoneyMovement(
        {
          account: "cash",
          amount: new Prisma.Decimal("0.20"),
          sourceType: "repayment",
          sourceId: `${p.prefix}b`,
          occurredAt: new Date("2026-08-21T09:01:00Z"),
        },
        { actorId: p.actorId },
      );

      const { cash } = await getAccountBalances();
      // Global ledger may hold other suites' rows; assert the delta is exact
      // by reading just this suite's two rows instead.
      const rows = await prisma.moneyMovement.findMany({
        where: { sourceId: { startsWith: p.prefix } },
      });
      const sum = rows.reduce(
        (acc, r) => acc.plus(r.amount),
        new Prisma.Decimal(0),
      );
      expect(sum.toFixed(2)).toBe("0.30");
      expect(cash).toBeInstanceOf(Prisma.Decimal);
    } finally {
      await cleanupFinancialsTestData(scope);
    }
  });
});
