import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import { getFinancialSummary } from "@/lib/domain/financials";
import { setAttendance } from "./attendance";
import {
  getPayrollSummary,
  getStaffPay,
  payAllUnpaid,
  payStaff,
  recordPayAdjustment,
} from "./pay";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "payout";

/**
 * Staff payout (M4 S9A, ADR-60). A payout creates ONE Salaries `Expense`
 * via `recordExpense`; that expense writes the paired negative
 * `MoneyMovement`. Cash drops once, Net Profit drops once.
 *
 * All months here are wholly in the PAST relative to the seeded
 * `currentDate` (2026-09-03) so `payableDays` is the whole month and the
 * arithmetic is deterministic. Every figure is checked as a DELTA
 * (before/after) because the suite shares the dev DB.
 */
describe("staff payout", () => {
  let ctx: StaffTestCtx;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  // ── THE no-double-count assertion ───────────────────────────────────
  it("posts the net pay exactly ONCE — one Expense, cash −net, net profit −net", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} DoubleCount`,
      dailyRate: "600.00",
    });
    // June 2026, 30 days, no absences → gross 18000, no adjustments → net 18000
    const month = "2026-06";
    const date = "2026-07-02";
    const pay = await getStaffPay(id, month);
    expect(pay.netPay).toBe("18000.00");
    expect(pay.paid).toBe(false);

    const WIN_FROM = "2026-07-01";
    const WIN_TO = "2026-07-31";
    const before = await getFinancialSummary(WIN_FROM, WIN_TO);
    const expensesBefore = await prisma.expense.count({
      where: { category: "salaries", date: { gte: new Date("2026-07-01T00:00:00+03:00"), lt: new Date("2026-08-01T00:00:00+03:00") } },
    });

    const result = await payStaff(
      { staffId: id, month, paidFromAccount: "cash", date },
      admin(),
    );

    expect(result.paid).toBe(true);
    expect(result.payout).not.toBeNull();
    expect(result.payout!.netPaid).toBe("18000.00");
    expect(result.payout!.paidFromAccount).toBe("cash");

    // Exactly ONE Salaries expense was added in the window.
    const expensesAfter = await prisma.expense.count({
      where: { category: "salaries", date: { gte: new Date("2026-07-01T00:00:00+03:00"), lt: new Date("2026-08-01T00:00:00+03:00") } },
    });
    expect(expensesAfter - expensesBefore).toBe(1);

    // Exactly ONE expense row is linked to this payout, and exactly ONE
    // paired MoneyMovement (written by recordExpense, not by us).
    const payoutRow = await prisma.staffPayout.findUniqueOrThrow({
      where: { id: result.payout!.id },
    });
    const linkedExpense = await prisma.expense.findUniqueOrThrow({
      where: { id: payoutRow.expenseId },
    });
    expect(linkedExpense.category).toBe("salaries");
    expect(linkedExpense.amount.toFixed(2)).toBe("18000.00");
    const movements = await prisma.moneyMovement.findMany({
      where: { sourceType: "expense", sourceId: payoutRow.expenseId },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].amount.toFixed(2)).toBe("-18000.00");
    expect(movements[0].account).toBe("cash");

    // getFinancialSummary: net profit dropped by EXACTLY 18000, no more.
    const after = await getFinancialSummary(WIN_FROM, WIN_TO);
    const dNet = new Prisma.Decimal(after.consolidated.netProfit).minus(
      before.consolidated.netProfit,
    );
    const dExpenses = new Prisma.Decimal(after.consolidated.totalExpenses).minus(
      before.consolidated.totalExpenses,
    );
    const dCash = new Prisma.Decimal(after.consolidated.cashBalance).minus(
      before.consolidated.cashBalance,
    );
    expect(dNet.toFixed(2)).toBe("-18000.00");
    expect(dExpenses.toFixed(2)).toBe("18000.00");
    expect(dCash.toFixed(2)).toBe("-18000.00");
  });

  it("paying the same staff-month twice is rejected — CONFLICT, and the DB unique also holds", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Twice`,
      dailyRate: "500.00",
    });
    await payStaff(
      { staffId: id, month: "2026-05", paidFromAccount: "cash", date: "2026-06-01" },
      admin(),
    );
    await expect(
      payStaff(
        { staffId: id, month: "2026-05", paidFromAccount: "mpesa_bank", date: "2026-06-02" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    // The DB constraint itself refuses a direct duplicate insert.
    const first = await prisma.staffPayout.findFirstOrThrow({
      where: { staffId: id },
    });
    await expect(
      prisma.staffPayout.create({
        data: {
          staffId: id,
          month: first.month,
          netPaid: new Prisma.Decimal("1.00"),
          date: first.date,
          paidFromAccount: "cash",
          recordedById: ctx.adminId,
          expenseId: `${first.expenseId}-x`, // unique expense id, dup [staff,month]
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    // Only one payout, one Salaries expense for that month.
    expect(await prisma.staffPayout.count({ where: { staffId: id } })).toBe(1);
  });

  it("a FUTURE month is rejected", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Future`, dailyRate: "500.00" });
    await expect(
      payStaff(
        { staffId: id, month: "2027-01", paidFromAccount: "cash", date: "2026-09-02" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "month" });
    expect(await prisma.staffPayout.count({ where: { staffId: id } })).toBe(0);
  });

  it("a CLOSED disbursement day is rejected (assertDayOpen), nothing written", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Closed`, dailyRate: "500.00" });
    const day = "2026-04-15";
    await closeDay(day, ctx.adminId);
    try {
      await expect(
        payStaff(
          { staffId: id, month: "2026-04", paidFromAccount: "cash", date: day },
          admin(),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(await prisma.staffPayout.count({ where: { staffId: id } })).toBe(0);
      // No orphan Salaries expense either — the whole tx rolled back.
      const orphan = await prisma.expense.count({
        where: {
          category: "salaries",
          recordedById: ctx.adminId,
          date: { gte: new Date("2026-04-15T00:00:00+03:00"), lt: new Date("2026-04-16T00:00:00+03:00") },
        },
      });
      expect(orphan).toBe(0);
    } finally {
      await reopenDay(day, ctx.adminId);
    }
  });

  it("a net of zero or less is rejected — the over-advance stays on the books (ADR-60)", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} ZeroNet`,
      dailyRate: "500.00",
    });
    // gross for June = 15000; advance 20000 → net = −5000
    await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "20000.00", date: "2026-06-10" },
      admin(),
    );
    const pay = await getStaffPay(id, "2026-06");
    expect(pay.netPay).toBe("-5000.00"); // NOT floored

    await expect(
      payStaff(
        { staffId: id, month: "2026-06", paidFromAccount: "cash", date: "2026-07-01" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "net" });

    // Nothing disbursed; the advance row is untouched (carried, not lost).
    expect(await prisma.staffPayout.count({ where: { staffId: id } })).toBe(0);
    const still = await getStaffPay(id, "2026-06");
    expect(still.advances).toBe("20000.00");
    expect(still.paid).toBe(false);
  });

  it("the amount is ALWAYS recomputed server-side — a client 'amount' has no effect", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} ServerAmount`,
      dailyRate: "700.00",
    });
    // June net = 21000. Pass a bogus amount alongside the valid input.
    const result = await payStaff(
      // @ts-expect-error — amount is not part of PayStaffInput; ignored at runtime
      { staffId: id, month: "2026-06", paidFromAccount: "cash", date: "2026-07-01", amount: "1.00" },
      admin(),
    );
    expect(result.payout!.netPaid).toBe("21000.00");
    const exp = await prisma.expense.findUniqueOrThrow({
      where: { id: result.payout!.expenseId },
    });
    expect(exp.amount.toFixed(2)).toBe("21000.00");
  });

  it("handover shortfalls still do NOT affect net pay (S8A assertion kept)", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Shortfall`,
      dailyRate: "500.00",
    });
    // Book a handover shortfall against this staff member.
    const loc = await prisma.location.findFirstOrThrow({
      where: { name: { startsWith: ctx.prefix } },
    });
    const at = new Date("2026-06-10T12:00:00+03:00");
    const handover = await prisma.handover.create({
      data: {
        staffId: id,
        locationId: loc.id,
        cashDeclared: new Prisma.Decimal("1000.00"),
        mpesaDeclared: new Prisma.Decimal("0.00"),
        occurredAt: at,
      },
    });
    const receipt = await prisma.receiptOfHandover.create({
      data: {
        handoverId: handover.id,
        recordedById: ctx.adminId,
        cashReceived: new Prisma.Decimal("400.00"),
        mpesaReceived: new Prisma.Decimal("0.00"),
        cashVariance: new Prisma.Decimal("-600.00"),
        mpesaVariance: new Prisma.Decimal("0.00"),
        occurredAt: at,
      },
    });
    await prisma.handoverShortfall.create({
      data: { receiptOfHandoverId: receipt.id, staffId: id, note: "short KES 600" },
    });

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.netPay).toBe("15000.00"); // 500 × 30, shortfall ignored

    const result = await payStaff(
      { staffId: id, month: "2026-06", paidFromAccount: "cash", date: "2026-07-01" },
      admin(),
    );
    expect(result.payout!.netPaid).toBe("15000.00");

    // cleanup local handover rows (not covered by the scope prefix cleanup)
    await prisma.handoverShortfall.deleteMany({ where: { staffId: id } });
    await prisma.receiptOfHandover.deleteMany({ where: { id: receipt.id } });
    await prisma.handover.deleteMany({ where: { id: handover.id } });
  });

  // ── payAllUnpaid ───────────────────────────────────────────────────
  it("payAllUnpaid: one Expense per unpaid active staff, skips the already-paid without failing", async () => {
    const local = await setupStaffWorld("payout-all");
    const localAdmin = { actorId: local.adminId, role: "admin" };
    // `payAllUnpaid` is business-wide — it will also pay any OTHER active
    // staff (seed / parallel suites) that are unpaid for the month, in the
    // shared dev DB. Use a month no other fixture touches and sweep every
    // payout for it afterwards so nothing leaks.
    const MONTH = "2026-02";
    const cleanupMonthPayouts = async () => {
      const rows = await prisma.staffPayout.findMany({
        where: { month: new Date("2026-02-01T00:00:00.000Z") },
        select: { id: true, expenseId: true },
      });
      const eids = rows.map((r) => r.expenseId);
      await prisma.staffPayout.deleteMany({
        where: { id: { in: rows.map((r) => r.id) } },
      });
      if (eids.length) {
        await prisma.moneyMovement.deleteMany({
          where: { sourceType: "expense", sourceId: { in: eids } },
        });
        await prisma.auditLog.deleteMany({
          where: { entityType: "expense", entityId: { in: eids } },
        });
        await prisma.expense.deleteMany({ where: { id: { in: eids } } });
      }
    };
    try {
      await cleanupMonthPayouts();
      const a = await makeBareStaff(local, { name: `${local.prefix} A`, dailyRate: "500.00" });
      const b = await makeBareStaff(local, { name: `${local.prefix} B`, dailyRate: "700.00" });
      const c = await makeBareStaff(local, { name: `${local.prefix} C ZeroNet`, dailyRate: "500.00" });
      await makeBareStaff(local, { name: `${local.prefix} Inactive`, dailyRate: "999.00", active: false });

      // c: advance wipes out the net → must be SKIPPED
      await recordPayAdjustment(
        { staffId: c, type: "advance", amount: "999999.00", date: "2026-02-05" },
        localAdmin,
      );
      // a: pay individually first → must be SKIPPED as already-paid
      await payStaff(
        { staffId: a, month: MONTH, paidFromAccount: "cash", date: "2026-03-01" },
        localAdmin,
      );

      // `payAllUnpaid` is a business-wide admin action — its `paid` /
      // `skipped` lists cover EVERY active staff member (seed + other
      // suites), all recorded by the acting admin. Assert only on this
      // suite's three staff.
      const res = await payAllUnpaid(
        { month: MONTH, paidFromAccount: "cash", date: "2026-03-01" },
        localAdmin,
      );

      // b: newly paid, with EXACTLY one payout row and one linked expense.
      const bPaid = res.paid.find((p) => p.staffId === b);
      expect(bPaid).toBeDefined();
      expect(bPaid!.netPaid).toBe("19600.00"); // 700 × 28 (Feb 2026)
      expect(await prisma.staffPayout.count({ where: { staffId: b } })).toBe(1);
      const bExpenses = await prisma.expense.findMany({
        where: { id: bPaid!.expenseId },
      });
      expect(bExpenses).toHaveLength(1);
      expect(bExpenses[0].category).toBe("salaries");
      expect(bExpenses[0].amount.toFixed(2)).toBe("19600.00");

      // a: skipped, already paid. c: skipped, zero net. Neither got a 2nd
      // payout row.
      expect(res.paid.some((p) => p.staffId === a)).toBe(false);
      expect(res.paid.some((p) => p.staffId === c)).toBe(false);
      expect(res.skipped.find((s) => s.staffId === a)!.reason).toMatch(/already paid/);
      expect(res.skipped.find((s) => s.staffId === c)!.reason).toMatch(/zero or less/);
      expect(await prisma.staffPayout.count({ where: { staffId: a } })).toBe(1);
      expect(await prisma.staffPayout.count({ where: { staffId: c } })).toBe(0);

      // Inactive staff never appears in either list.
      const inactive = await prisma.staff.findFirstOrThrow({
        where: { name: { startsWith: local.prefix }, active: false },
      });
      expect(res.paid.some((p) => p.staffId === inactive.id)).toBe(false);
      expect(res.skipped.some((s) => s.staffId === inactive.id)).toBe(false);

      // Per-row paid status for this suite's staff.
      const summary = await getPayrollSummary(MONTH);
      expect(summary.rows.find((r) => r.staffId === a)!.paid).toBe(true);
      expect(summary.rows.find((r) => r.staffId === b)!.paid).toBe(true);
      expect(summary.rows.find((r) => r.staffId === c)!.paid).toBe(false);
    } finally {
      await cleanupMonthPayouts();
      await cleanupStaffTestData("payout-all");
    }
  });

  it("payAllUnpaid rejects a future month outright", async () => {
    await expect(
      payAllUnpaid(
        { month: "2099-01", paidFromAccount: "cash", date: "2026-09-02" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "month" });
  });

  it("non-admin cannot pay", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Guard`, dailyRate: "500.00" });
    await expect(
      payStaff(
        { staffId: id, month: "2026-06", paidFromAccount: "cash", date: "2026-07-01" },
        { actorId: ctx.adminId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      payAllUnpaid(
        { month: "2026-06", paidFromAccount: "cash", date: "2026-07-01" },
        { actorId: ctx.adminId, role: "store_manager" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("getStaffPay / getPayrollSummary carry paid status, the date, account and payout id", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Status`, dailyRate: "500.00" });
    const before = await getStaffPay(id, "2026-06");
    expect(before.paid).toBe(false);
    expect(before.payout).toBeNull();

    const paid = await payStaff(
      { staffId: id, month: "2026-06", paidFromAccount: "mpesa_bank", date: "2026-07-03" },
      admin(),
    );
    expect(paid.paid).toBe(true);
    expect(paid.payout).toMatchObject({
      staffId: id,
      month: "2026-06",
      netPaid: "15000.00",
      date: "2026-07-03",
      paidFromAccount: "mpesa_bank",
    });
    expect(paid.payout!.id).toBeTruthy();
    expect(paid.payout!.expenseId).toBeTruthy();

    const summary = await getPayrollSummary("2026-06");
    const row = summary.rows.find((r) => r.staffId === id)!;
    expect(row.paid).toBe(true);
    expect(row.payout!.date).toBe("2026-07-03");
    expect(row.payout!.paidFromAccount).toBe("mpesa_bank");
  });
});
