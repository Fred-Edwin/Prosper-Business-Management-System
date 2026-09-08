import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  correctOwnerTransaction,
  voidOwnerTransaction,
} from "./correct-owner-transaction";
import {
  getOwnerOwedToBusiness,
  listOwnerTransactions,
  recordOwnerTransaction,
} from "./owner-transactions";
import {
  cleanupFinancialsTestData,
  setupFinancialsTestData,
  type FinancialsTestCtx,
} from "./test-helpers";

const SCOPE = "correct_owner_txn";

/**
 * Net `cash` movement for THIS suite's owner rows only — the worker schema
 * is shared, so scope by the `sourceId`s belonging to `ownerTransactionId`
 * and its correction rows.
 */
async function cashForOriginal(originalId: string): Promise<number> {
  const ids = [
    originalId,
    ...(
      await prisma.ownerTransaction.findMany({
        where: { correctsOwnerTransactionId: originalId },
        select: { id: true },
      })
    ).map((r) => r.id),
  ];
  const rows = await prisma.moneyMovement.groupBy({
    by: ["account"],
    _sum: { amount: true },
    where: {
      account: "cash",
      sourceType: { in: ["owner_draw", "owner_return"] },
      sourceId: { in: ids },
    },
  });
  return Number(rows[0]?._sum.amount ?? 0);
}

describe("correctOwnerTransaction / voidOwnerTransaction (ADR-72)", () => {
  let ctx: FinancialsTestCtx;
  let note: string;
  const admin = () => ({ actorId: ctx.actorId, role: "admin" }) as const;

  beforeAll(async () => {
    ctx = await setupFinancialsTestData(SCOPE);
    note = `${ctx.prefix} note`;
  });
  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  async function seedDraw(amount = "5000.00", date = "2026-08-10") {
    return recordOwnerTransaction({ type: "draw", amount, date, note }, admin());
  }

  it("writes a signed delta row and moves cash by the delta (draw reduced)", async () => {
    const original = await seedDraw(); // -5000 cash
    expect(await cashForOriginal(original.id)).toBe(-5000);

    await correctOwnerTransaction(
      { ownerTransactionId: original.id, type: "draw", amount: "3000.00" },
      admin(),
    );

    // The correction row: type flips to "return" (a +2000 signed delta),
    // amount 2000, linked, same date.
    const rows = await prisma.ownerTransaction.findMany({
      where: {
        OR: [{ id: original.id }, { correctsOwnerTransactionId: original.id }],
      },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].correctsOwnerTransactionId).toBe(original.id);
    expect(rows[1].type).toBe("return");
    expect(Number(rows[1].amount)).toBe(2000);
    expect(rows[1].date.toISOString()).toBe(rows[0].date.toISOString());

    // Cash nets to -3000 (a 3000 draw).
    expect(await cashForOriginal(original.id)).toBe(-3000);
  });

  it("folds the correction into the list — one row, derived type + amount", async () => {
    const original = await seedDraw("4000.00", "2026-08-11");
    await correctOwnerTransaction(
      { ownerTransactionId: original.id, type: "draw", amount: "1500.00" },
      admin(),
    );

    const list = await listOwnerTransactions({
      from: "2026-08-11",
      to: "2026-08-11",
    });
    const row = list.find((r) => r.id === original.id);
    expect(row).toBeDefined();
    expect(row!.type).toBe("draw");
    expect(row!.amount).toBe("1500.00");
    expect(row!.corrected).toBe(true);
    // The correction row itself is never returned standalone.
    expect(list.some((r) => r.id !== original.id && r.date === row!.date)).toBe(
      false,
    );
  });

  it("a type flip (draw → return) reverses the old signed amount and applies the new one", async () => {
    const original = await seedDraw("2000.00", "2026-08-12"); // -2000 cash
    await correctOwnerTransaction(
      { ownerTransactionId: original.id, type: "return", amount: "2000.00" },
      admin(),
    );
    // Was -2000, now +2000 — a single +4000 cash delta.
    expect(await cashForOriginal(original.id)).toBe(2000);

    const list = await listOwnerTransactions({
      from: "2026-08-12",
      to: "2026-08-12",
    });
    const row = list.find((r) => r.id === original.id)!;
    expect(row.type).toBe("return");
    expect(row.amount).toBe("2000.00");
  });

  it("re-submitting the same values is rejected (delta 0)", async () => {
    const original = await seedDraw("1000.00", "2026-08-13");
    await expect(
      correctOwnerTransaction(
        { ownerTransactionId: original.id, type: "draw", amount: "1000.00" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("a correction row cannot itself be corrected (no chaining)", async () => {
    const original = await seedDraw("1000.00", "2026-08-14");
    await correctOwnerTransaction(
      { ownerTransactionId: original.id, type: "draw", amount: "500.00" },
      admin(),
    );
    const correction = await prisma.ownerTransaction.findFirstOrThrow({
      where: { correctsOwnerTransactionId: original.id },
    });
    await expect(
      correctOwnerTransaction(
        { ownerTransactionId: correction.id, type: "draw", amount: "1.00" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("non-admin is FORBIDDEN", async () => {
    const original = await seedDraw("1000.00", "2026-08-15");
    await expect(
      correctOwnerTransaction(
        { ownerTransactionId: original.id, type: "draw", amount: "900.00" },
        { actorId: ctx.otherActorId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      voidOwnerTransaction(original.id, {
        actorId: ctx.otherActorId,
        role: "cashier",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("writes an audit-log row with matching was/now scalar keys", async () => {
    const original = await seedDraw("3000.00", "2026-08-16");
    await correctOwnerTransaction(
      { ownerTransactionId: original.id, type: "return", amount: "1000.00" },
      admin(),
    );
    const log = await prisma.auditLog.findFirstOrThrow({
      where: {
        entityType: "owner_transaction",
        entityId: original.id,
        action: "correct",
      },
    });
    const oldV = log.oldValue as Record<string, unknown>;
    const newV = log.newValue as Record<string, unknown>;
    expect(oldV.type).toBe("Draw (money out)");
    expect(oldV.amount).toBe("3000.00");
    expect(newV.type).toBe("Return (money in)");
    expect(newV.amount).toBe("1000.00");
    expect(newV.correctionId).toBeDefined();
  });

  describe("voidOwnerTransaction", () => {
    it("reverses the transaction and returns the cash effect to zero", async () => {
      const original = await seedDraw("5000.00", "2026-08-17"); // -5000
      const owedBefore = await getOwnerOwedToBusiness();

      await voidOwnerTransaction(original.id, admin());

      expect(await cashForOriginal(original.id)).toBe(0);
      // Owed-to-business drops back by the voided draw.
      const owedAfter = await getOwnerOwedToBusiness();
      expect(owedAfter.sub(owedBefore).toFixed(2)).toBe("-5000.00");

      const reversal = await prisma.ownerTransaction.findFirstOrThrow({
        where: { correctsOwnerTransactionId: original.id },
      });
      expect(reversal.type).toBe("return"); // reverses a draw
      expect(Number(reversal.amount)).toBe(5000);
    });

    it("voiding an already-voided transaction is rejected", async () => {
      const original = await seedDraw("1000.00", "2026-08-18");
      await voidOwnerTransaction(original.id, admin());
      await expect(
        voidOwnerTransaction(original.id, admin()),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("a voided transaction drops off the list", async () => {
      const original = await seedDraw("1200.00", "2026-08-19");
      await voidOwnerTransaction(original.id, admin());
      const list = await listOwnerTransactions({
        from: "2026-08-19",
        to: "2026-08-19",
      });
      const row = list.find((r) => r.id === original.id)!;
      // Still one row, derived amount 0 — the void folds in like any
      // correction. (No separate correction row is surfaced.)
      expect(row.amount).toBe("0.00");
      expect(list.filter((r) => r.date === row.date)).toHaveLength(1);
    });
  });
});
