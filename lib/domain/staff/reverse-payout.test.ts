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

  /** Pay the whole remaining balance for a staff-month (one instalment). */
  const payFull = async (
    staffId: string,
    month: string,
    date: string,
    paidFromAccount: "cash" | "mpesa_bank" = "cash",
  ) => {
    const { netRemaining } = await getStaffPay(staffId, month);
    return payStaff(
      { staffId, month, paidFromAccount, date, amount: netRemaining },
      admin(),
    );
  };

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

    const paid = await payFull(id, month, "2026-07-02");
    expect(paid.paid).toBe(true);
    const payoutId = paid.payouts[0]!.id;
    const expenseId = paid.payouts[0]!.expenseId;

    const reversed = await reversePayout(payoutId, admin());
    expect(reversed.id).toBe(payoutId);
    expect(reversed.reversedAt).not.toBeNull();

    // The staff-month reads unpaid again.
    const after = await getStaffPay(id, month);
    expect(after.paid).toBe(false);
    expect(after.payouts).toEqual([]);
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
    const { netRemaining: repayAmt } = await getStaffPay(id, month);
    const repaid = await payStaff(
      { staffId: id, month, paidFromAccount: "mpesa_bank", date: "2026-07-20", amount: repayAmt },
      admin(),
    );
    expect(repaid.paid).toBe(true);
    expect(repaid.payouts[0]!.id).not.toBe(payoutId);
    expect(repaid.payouts[0]!.paidFromAccount).toBe("mpesa_bank");

    // Two payout rows exist for the month: one reversed, one live.
    const rows = await prisma.staffPayout.findMany({ where: { staffId: id } });
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.reversedAt === null)).toHaveLength(1);
  });

  it("reversing one of several partials frees exactly its amount, leaves the others live", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} MultiPartial`,
      dailyRate: "500.00",
    });
    const month = "2026-06"; // 30 days → net 15000

    // Three instalments: 4000, 6000, 5000 → fully settled.
    const p1 = await payStaff(
      { staffId: id, month, paidFromAccount: "cash", date: "2026-07-02", amount: "4000.00" },
      admin(),
    );
    await payStaff(
      { staffId: id, month, paidFromAccount: "cash", date: "2026-07-05", amount: "6000.00" },
      admin(),
    );
    await payStaff(
      { staffId: id, month, paidFromAccount: "cash", date: "2026-07-09", amount: "5000.00" },
      admin(),
    );
    const settled = await getStaffPay(id, month);
    expect(settled.paid).toBe(true);
    expect(settled.payouts).toHaveLength(3);

    // Reverse the FIRST (4000) instalment.
    await reversePayout(p1.payouts[0]!.id, admin());

    const after = await getStaffPay(id, month);
    // Exactly 4000 freed — netPaid 11000, remaining 4000, no longer settled.
    expect(after.netPaid).toBe("11000.00");
    expect(after.netRemaining).toBe("4000.00");
    expect(after.paid).toBe(false);
    // The other two partials are still live, oldest first.
    expect(after.payouts).toHaveLength(2);
    expect(after.payouts.map((p) => p.netPaid)).toEqual(["6000.00", "5000.00"]);

    // Pay the freed 4000 back — settled again, a 4th live payout.
    const done = await payStaff(
      { staffId: id, month, paidFromAccount: "mpesa_bank", date: "2026-07-15", amount: "4000.00" },
      admin(),
    );
    expect(done.paid).toBe(true);
    expect(done.payouts).toHaveLength(3);
    // 4 rows total: 1 reversed + 3 live.
    const rows = await prisma.staffPayout.findMany({ where: { staffId: id } });
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.reversedAt === null)).toHaveLength(3);
  });

  it("reversing an already-reversed payout is CONFLICT", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Twice`,
      dailyRate: "500.00",
    });
    const paid = await payFull(id, "2026-05", "2026-06-02");
    await reversePayout(paid.payouts[0]!.id, admin());
    await expect(
      reversePayout(paid.payouts[0]!.id, admin()),
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
    const paid = await payFull(id, "2026-04", "2026-05-02");
    await expect(
      reversePayout(paid.payouts[0]!.id, {
        actorId: ctx.adminId,
        role: "store_manager",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const row = await prisma.staffPayout.findUniqueOrThrow({
      where: { id: paid.payouts[0]!.id },
    });
    expect(row.reversedAt).toBeNull();
  });

  it("a closed disbursement day does NOT block a reversal (Admin delta row always allowed)", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} ClosedDay`,
      dailyRate: "500.00",
    });
    const day = "2026-03-10";
    const paid = await payFull(id, "2026-03", day);
    await closeDay(day, ctx.adminId);
    try {
      const reversed = await reversePayout(paid.payouts[0]!.id, admin());
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
    const paid = await payFull(id, month, "2026-07-05");
    const expenseId = paid.payouts[0]!.expenseId;

    // Admin trims the Salaries expense to 25000 via the Financials drawer.
    await correctExpense({ expenseId, amount: "25000.00" }, admin());

    const before = await getFinancialSummary("2026-07-01", "2026-07-31");
    await reversePayout(paid.payouts[0]!.id, admin());
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
