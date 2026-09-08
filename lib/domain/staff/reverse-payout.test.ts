import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import { correctExpense, getFinancialSummary } from "@/lib/domain/financials";
import {
  getPayrollSummary,
  getStaffPay,
  payStaff,
  reversePayout,
} from "./pay";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "reverse-payout";

/**
 * Staff payout reversal (ADR-73, per ADR-72's deferred list). A reversal
 * zeroes the linked Salaries `Expense` (restoring Cash + Net Profit) and
 * stamps `StaffPayout.reversedAt`, so the staff-month is payable again.
 * No `corrects_staff_payout_id` lineage — the payout's money effect lives
 * entirely on its Expense.
 *
 * All months are wholly in the PAST so `payableDays` is the whole month.
 * Money figures are checked as before/after DELTAS (shared DB).
 */
describe("staff payout reversal", () => {
  let ctx: StaffTestCtx;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" as const });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("restores Cash + Net Profit exactly, and frees the staff-month to be paid again", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Roundtrip`,
      dailyRate: "600.00",
    });
    const month = "2026-06"; // 30 days → gross 18000, net 18000
    const WIN_FROM = "2026-07-01";
    const WIN_TO = "2026-07-31";

    const before = await getFinancialSummary(WIN_FROM, WIN_TO);

    const paid = await payStaff(
      { staffId: id, month, paidFromAccount: "cash", date: "2026-07-02" },
      admin(),
    );
    expect(paid.paid).toBe(true);
    const payoutId = paid.payout!.id;
    const expenseId = paid.payout!.expenseId;

    const reversed = await reversePayout(payoutId, admin());
    expect(reversed.id).toBe(payoutId);
    expect(reversed.reversedAt).not.toBeNull();

    // The staff-month reads unpaid again.
    const after = await getStaffPay(id, month);
    expect(after.paid).toBe(false);
    expect(after.payout).toBeNull();
    const summary = await getPayrollSummary(month);
    expect(summary.rows.find((r) => r.staffId === id)!.paid).toBe(false);

    // The linked Salaries expense derives to zero: original + delta row.
    const original = await prisma.expense.findUniqueOrThrow({
      where: { id: expenseId },
    });
    const deltas = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { correctsExpenseId: expenseId },
    });
    expect(
      original.amount.add(deltas._sum.amount ?? 0).toFixed(2),
    ).toBe("0.00");

    // One offsetting MoneyMovement (+18000) paired to the correction row.
    const correction = await prisma.expense.findFirstOrThrow({
      where: { correctsExpenseId: expenseId },
    });
    const mv = await prisma.moneyMovement.findMany({
      where: { sourceType: "expense", sourceId: correction.id },
    });
    expect(mv).toHaveLength(1);
    expect(mv[0].amount.toFixed(2)).toBe("18000.00");
    expect(mv[0].account).toBe("cash");

    // Net Profit / Cash / Expenses back to where they started — no residue.
    const restored = await getFinancialSummary(WIN_FROM, WIN_TO);
    const dNet = new Prisma.Decimal(restored.consolidated.netProfit).minus(
      before.consolidated.netProfit,
    );
    const dCash = new Prisma.Decimal(restored.consolidated.cashBalance).minus(
      before.consolidated.cashBalance,
    );
    const dExp = new Prisma.Decimal(
      restored.consolidated.totalExpenses,
    ).minus(before.consolidated.totalExpenses);
    expect(dNet.toFixed(2)).toBe("0.00");
    expect(dCash.toFixed(2)).toBe("0.00");
    expect(dExp.toFixed(2)).toBe("0.00");

    // Now re-pay the same staff-month — the partial unique index allows it.
    const repaid = await payStaff(
      { staffId: id, month, paidFromAccount: "mpesa_bank", date: "2026-07-20" },
      admin(),
    );
    expect(repaid.paid).toBe(true);
    expect(repaid.payout!.id).not.toBe(payoutId);
    expect(repaid.payout!.paidFromAccount).toBe("mpesa_bank");

    // Two payout rows exist for the month: one reversed, one live.
    const rows = await prisma.staffPayout.findMany({ where: { staffId: id } });
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.reversedAt === null)).toHaveLength(1);
  });

  it("reversing an already-reversed payout is CONFLICT", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Twice`,
      dailyRate: "500.00",
    });
    const paid = await payStaff(
      { staffId: id, month: "2026-05", paidFromAccount: "cash", date: "2026-06-02" },
      admin(),
    );
    await reversePayout(paid.payout!.id, admin());
    await expect(
      reversePayout(paid.payout!.id, admin()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("an unknown payout id is NOT_FOUND", async () => {
    await expect(
      reversePayout("00000000-0000-0000-0000-000000000000", admin()),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a non-admin is FORBIDDEN, nothing written", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Role`,
      dailyRate: "500.00",
    });
    const paid = await payStaff(
      { staffId: id, month: "2026-04", paidFromAccount: "cash", date: "2026-05-02" },
      admin(),
    );
    await expect(
      reversePayout(paid.payout!.id, {
        actorId: ctx.adminId,
        role: "store_manager",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const row = await prisma.staffPayout.findUniqueOrThrow({
      where: { id: paid.payout!.id },
    });
    expect(row.reversedAt).toBeNull();
  });

  it("a closed disbursement day does NOT block a reversal (Admin delta row always allowed)", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} ClosedDay`,
      dailyRate: "500.00",
    });
    const day = "2026-03-10";
    const paid = await payStaff(
      { staffId: id, month: "2026-03", paidFromAccount: "cash", date: day },
      admin(),
    );
    await closeDay(day, ctx.adminId);
    try {
      const reversed = await reversePayout(paid.payout!.id, admin());
      expect(reversed.reversedAt).not.toBeNull();
      expect((await getStaffPay(id, "2026-03")).paid).toBe(false);
    } finally {
      await reopenDay(day, ctx.adminId);
    }
  });

  it("folds in an earlier manual expense correction — offsets the CURRENT derived value", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} PreCorrected`,
      dailyRate: "1000.00",
    });
    const month = "2026-06"; // gross 30000
    const paid = await payStaff(
      { staffId: id, month, paidFromAccount: "cash", date: "2026-07-05" },
      admin(),
    );
    const expenseId = paid.payout!.expenseId;

    // Admin trims the Salaries expense to 25000 via the Financials drawer.
    await correctExpense({ expenseId, amount: "25000.00" }, admin());

    const before = await getFinancialSummary("2026-07-01", "2026-07-31");
    await reversePayout(paid.payout!.id, admin());
    const after = await getFinancialSummary("2026-07-01", "2026-07-31");

    // Reversal removed exactly the remaining 25000 of effect.
    const dCash = new Prisma.Decimal(after.consolidated.cashBalance).minus(
      before.consolidated.cashBalance,
    );
    expect(dCash.toFixed(2)).toBe("25000.00");

    const original = await prisma.expense.findUniqueOrThrow({
      where: { id: expenseId },
    });
    const deltas = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { correctsExpenseId: expenseId },
    });
    expect(
      original.amount.add(deltas._sum.amount ?? 0).toFixed(2),
    ).toBe("0.00");
  });
});
