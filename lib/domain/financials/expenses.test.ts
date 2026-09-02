import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import { correctExpense, listExpenses, recordExpense } from "./expenses";

import {
  cleanupFinancialsTestData,
  setupFinancialsWorld,
  type FinancialsWorldCtx,
} from "./test-helpers";

const SCOPE = "expenses";

describe("recordExpense", () => {
  let ctx: FinancialsWorldCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE);
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("writes the Expense row AND a paired negative MoneyMovement debiting the paid-from account", async () => {
    const view = await recordExpense(
      {
        category: "rent",
        amount: "18000.00",
        date: "2026-08-20",
        paidFromAccount: "mpesa_bank",
        note: "  August rent  ",
      },
      { actorId: ctx.actorId, role: "admin" },
    );

    expect(view.amount).toBe("18000.00");
    expect(view.category).toBe("rent");
    expect(view.corrected).toBe(false);
    expect(view.note).toBe("August rent"); // trimmed

    const expenseRow = await prisma.expense.findUniqueOrThrow({
      where: { id: view.id },
    });
    expect(expenseRow.amount.toFixed(2)).toBe("18000.00");
    expect(expenseRow.recordedById).toBe(ctx.actorId);

    const paired = await prisma.moneyMovement.findMany({
      where: { sourceType: "expense", sourceId: view.id },
    });
    expect(paired).toHaveLength(1);
    expect(paired[0].account).toBe("mpesa_bank");
    expect(paired[0].amount.toFixed(2)).toBe("-18000.00"); // money OUT
    // The expense row and its money row commit together (one transaction).
    expect(paired[0].recordedById).toBe(ctx.actorId);
  });

  it("rejects a non-admin actor with FORBIDDEN, writing nothing", async () => {
    await expect(
      recordExpense(
        {
          category: "other",
          amount: "100.00",
          date: "2026-08-20",
          paidFromAccount: "cash",
        },
        { actorId: ctx.otherActorId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const rows = await prisma.expense.findMany({
      where: { recordedById: ctx.otherActorId },
    });
    expect(rows).toHaveLength(0);
  });

  it("rejects amount <= 0", async () => {
    await expect(
      recordExpense(
        {
          category: "other",
          amount: "0",
          date: "2026-08-20",
          paidFromAccount: "cash",
        },
        { actorId: ctx.actorId, role: "admin" },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("is day-close gated — a fresh expense on a sealed day is rejected", async () => {
    await prisma.dayClose.create({
      data: {
        date: businessDateOnly("2026-07-01"),
        closedBy: `${ctx.prefix} sealer`,
      },
    });

    await expect(
      recordExpense(
        {
          category: "utilities",
          amount: "500.00",
          date: "2026-07-01",
          paidFromAccount: "cash",
        },
        { actorId: ctx.actorId, role: "admin" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("correctExpense — append-only, stacking guard (M1 F-1)", () => {
  let ctx: FinancialsWorldCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld("expenses_correct");
  });

  afterAll(async () => {
    await cleanupFinancialsTestData("expenses_correct");
    await prisma.$disconnect();
  });

  async function seedExpense() {
    return recordExpense(
      {
        category: "transport",
        amount: "1000.00",
        date: "2026-08-15",
        paidFromAccount: "cash",
      },
      { actorId: ctx.actorId, role: "admin" },
    );
  }

  it("writes a signed delta row + paired money delta; the derived amount reflects the correction", async () => {
    const original = await seedExpense();

    const corrected = await correctExpense(
      { expenseId: original.id, amount: "1250.00" },
      { actorId: ctx.actorId, role: "admin" },
    );
    expect(corrected.amount).toBe("1250.00");
    expect(corrected.corrected).toBe(true);

    const rows = await prisma.expense.findMany({
      where: { correctsExpenseId: original.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount.toFixed(2)).toBe("250.00"); // delta, not absolute

    // Paired money delta: the expense grew by 250 → 250 MORE out of cash.
    const moneyDelta = await prisma.moneyMovement.findFirstOrThrow({
      where: { sourceType: "expense", sourceId: rows[0].id },
    });
    expect(moneyDelta.account).toBe("cash");
    expect(moneyDelta.amount.toFixed(2)).toBe("-250.00");

    // listExpenses folds the delta into the one row (no correction row).
    const listed = await listExpenses({ from: "2026-08-15", to: "2026-08-15" });
    const match = listed.find((e) => e.id === original.id);
    expect(match?.amount).toBe("1250.00");
    expect(listed.some((e) => e.id === rows[0].id)).toBe(false);
  });

  it("re-submitting the same corrected amount is delta-0 and is rejected (double-submit guard)", async () => {
    const original = await seedExpense();
    await correctExpense(
      { expenseId: original.id, amount: "1500.00" },
      { actorId: ctx.actorId, role: "admin" },
    );
    await expect(
      correctExpense(
        { expenseId: original.id, amount: "1500.00" },
        { actorId: ctx.actorId, role: "admin" },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const deltas = await prisma.expense.findMany({
      where: { correctsExpenseId: original.id },
    });
    expect(deltas).toHaveLength(1); // no second identical delta stacked
  });

  it("refuses to correct a correction row (corrections don't chain)", async () => {
    const original = await seedExpense();
    await correctExpense(
      { expenseId: original.id, amount: "900.00" },
      { actorId: ctx.actorId, role: "admin" },
    );
    const deltaRow = await prisma.expense.findFirstOrThrow({
      where: { correctsExpenseId: original.id },
    });
    await expect(
      correctExpense(
        { expenseId: deltaRow.id, amount: "800.00" },
        { actorId: ctx.actorId, role: "admin" },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "expenseId" });
  });

  it("stacks two DIFFERENT corrections correctly — delta measured against current derived value", async () => {
    const original = await seedExpense(); // 1000
    await correctExpense(
      { expenseId: original.id, amount: "1200.00" },
      { actorId: ctx.actorId, role: "admin" },
    ); // delta +200
    const second = await correctExpense(
      { expenseId: original.id, amount: "1100.00" },
      { actorId: ctx.actorId, role: "admin" },
    ); // delta -100 (against 1200, not 1000)
    expect(second.amount).toBe("1100.00");

    const deltas = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { correctsExpenseId: original.id },
    });
    expect(deltas._sum.amount?.toFixed(2)).toBe("100.00"); // +200 - 100
  });

  it("is NOT day-close gated — a correction works on a sealed day", async () => {
    const original = await seedExpense();
    await prisma.dayClose.create({
      data: {
        date: businessDateOnly("2026-08-15"),
        closedBy: `${ctx.prefix} sealer`,
      },
    });
    const corrected = await correctExpense(
      { expenseId: original.id, amount: "1111.00" },
      { actorId: ctx.actorId, role: "admin" },
    );
    expect(corrected.amount).toBe("1111.00");
  });
});
