import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import {
  correctExpense,
  listExpenses,
  recordExpense,
  voidExpense,
} from "./expenses";

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

describe("voidExpense — append-only reversal to zero (ADR-96)", () => {
  let ctx: FinancialsWorldCtx;
  const admin = () => ({ actorId: ctx.actorId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupFinancialsWorld("expenses_void");
  });

  afterAll(async () => {
    await cleanupFinancialsTestData("expenses_void");
    await prisma.$disconnect();
  });

  async function seedExpense(date = "2026-08-16") {
    return recordExpense(
      {
        category: "utilities",
        amount: "260.00",
        date,
        paidFromAccount: "cash",
      },
      admin(),
    );
  }

  async function netExpense(id: string) {
    const agg = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { OR: [{ id }, { correctsExpenseId: id }] },
    });
    return agg._sum.amount?.toFixed(2);
  }

  async function netMoney(id: string) {
    const rows = await prisma.expense.findMany({
      where: { OR: [{ id }, { correctsExpenseId: id }] },
      select: { id: true },
    });
    const agg = await prisma.moneyMovement.aggregate({
      _sum: { amount: true },
      where: { sourceType: "expense", sourceId: { in: rows.map((r) => r.id) } },
    });
    return agg._sum.amount?.toFixed(2);
  }

  it("writes a reversing row + paired money row: the expense and its cash both net to zero", async () => {
    const original = await seedExpense();
    const view = await voidExpense({ expenseId: original.id }, admin());

    expect(view.amount).toBe("0.00");
    expect(view.voided).toBe(true);
    expect(await netExpense(original.id)).toBe("0.00");
    expect(await netMoney(original.id)).toBe("0.00");

    const reversal = await prisma.expense.findFirstOrThrow({
      where: { correctsExpenseId: original.id },
    });
    expect(reversal.amount.toFixed(2)).toBe("-260.00");
    expect(reversal.note).toBe("Voided");
    // The original row is never mutated or deleted.
    const row = await prisma.expense.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(row.amount.toFixed(2)).toBe("260.00");
  });

  it("voids a previously corrected expense (the client's case: 260 → 1 → void)", async () => {
    const original = await seedExpense();
    await correctExpense({ expenseId: original.id, amount: "1.00" }, admin());

    const view = await voidExpense(
      { expenseId: original.id, note: "  client asked to delete " },
      admin(),
    );
    expect(view.voided).toBe(true);
    expect(await netExpense(original.id)).toBe("0.00");
    expect(await netMoney(original.id)).toBe("0.00");

    const reversal = await prisma.expense.findFirstOrThrow({
      where: { correctsExpenseId: original.id },
      orderBy: { createdAt: "desc" },
    });
    expect(reversal.amount.toFixed(2)).toBe("-1.00"); // current value, not 260
    expect(reversal.note).toBe("client asked to delete");
  });

  it("writes an audit row flagged void", async () => {
    const original = await seedExpense();
    await voidExpense({ expenseId: original.id }, admin());
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityType: "expense", entityId: original.id, action: "correct" },
    });
    expect(audit.newValue).toMatchObject({ void: true, amountTo: "0.00" });
  });

  it("listExpenses hides voided rows unless includeVoided is set", async () => {
    const original = await seedExpense("2026-08-17");
    await voidExpense({ expenseId: original.id }, admin());

    const hidden = await listExpenses({ from: "2026-08-17", to: "2026-08-17" });
    expect(hidden.some((e) => e.id === original.id)).toBe(false);

    const shown = await listExpenses({
      from: "2026-08-17",
      to: "2026-08-17",
      includeVoided: true,
    });
    expect(shown.find((e) => e.id === original.id)?.voided).toBe(true);
  });

  it("rejects a second void of the same expense", async () => {
    const original = await seedExpense();
    await voidExpense({ expenseId: original.id }, admin());
    await expect(
      voidExpense({ expenseId: original.id }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses to void a correction row", async () => {
    const original = await seedExpense();
    await correctExpense({ expenseId: original.id, amount: "300.00" }, admin());
    const correction = await prisma.expense.findFirstOrThrow({
      where: { correctsExpenseId: original.id },
    });
    await expect(
      voidExpense({ expenseId: correction.id }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a non-admin with FORBIDDEN, and an unknown id with NOT_FOUND", async () => {
    const original = await seedExpense();
    await expect(
      voidExpense(
        { expenseId: original.id },
        { actorId: ctx.otherActorId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await netExpense(original.id)).toBe("260.00");

    await expect(
      voidExpense({ expenseId: "00000000-0000-0000-0000-000000000000" }, admin()),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is NOT day-close gated — a void works on a sealed day", async () => {
    const original = await seedExpense("2026-08-18");
    await prisma.dayClose.create({
      data: {
        date: businessDateOnly("2026-08-18"),
        closedBy: `${ctx.prefix} sealer`,
      },
    });
    const view = await voidExpense({ expenseId: original.id }, admin());
    expect(view.voided).toBe(true);
  });
});
