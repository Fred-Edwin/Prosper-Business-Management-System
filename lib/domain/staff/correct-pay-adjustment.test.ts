import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import { getPayrollSummary, getStaffPay, recordPayAdjustment } from "./pay";
import {
  correctPayAdjustment,
  voidPayAdjustment,
} from "./correct-pay-adjustment";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "correct-pay-adj";

/**
 * ADR-72 — Correct / Void for staff pay advances & deductions.
 *
 * Unlike every other ADR-72 correction, a `StaffPayAdjustment` is NOT a
 * cash-ledger event — `correctPayAdjustment` / `voidPayAdjustment` write
 * ONLY the linked signed-delta `StaffPayAdjustment` row, no
 * `MoneyMovement`. So these tests assert the delta math + the folded
 * `getStaffPay` figure, never a money ledger.
 *
 * All months are wholly in the PAST relative to the seeded `currentDate`
 * (2026-09-03), so `payableDays` = every calendar day and the arithmetic
 * is deterministic.
 */
describe("correctPayAdjustment / voidPayAdjustment", () => {
  let ctx: StaffTestCtx;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  async function noMoneyMovementFor(sourceId: string) {
    const mm = await prisma.moneyMovement.findFirst({ where: { sourceId } });
    expect(mm).toBeNull();
  }

  it("writes ONE signed-delta row, no MoneyMovement, and getStaffPay folds it in", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Delta`,
      dailyRate: "1000.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "2000.00", date: "2026-06-10" },
      admin(),
    );

    // 2000 → 3500 : delta +1500, same type/date.
    const corr = await correctPayAdjustment(
      { adjustmentId: adj.id, amount: "3500.00" },
      admin(),
    );
    expect(corr.type).toBe("advance");
    expect(corr.amount).toBe("1500.00");

    const rows = await prisma.staffPayAdjustment.findMany({
      where: { staffId: id },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].correctsAdjustmentId).toBe(adj.id);
    expect(rows[1].amount.toFixed(2)).toBe("1500.00");
    await noMoneyMovementFor(corr.id);

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.advances).toBe("3500.00"); // 2000 + 1500
    expect(pay.deductions).toBe("0.00");
    expect(pay.netPay).toBe("26500.00"); // 30000 − 3500
    // The original is the only row surfaced; it reads the derived amount.
    expect(pay.adjustments).toHaveLength(1);
    expect(pay.adjustments[0].id).toBe(adj.id);
    expect(pay.adjustments[0].amount).toBe("3500.00");
    expect(pay.adjustments[0].originalAmount).toBe("2000.00");
    expect(pay.adjustments[0].corrected).toBe(true);
  });

  it("a correction DOWN carries a negative delta and reduces the folded figure", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Down`,
      dailyRate: "500.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "deduction", amount: "800.00", date: "2026-06-04" },
      admin(),
    );
    const corr = await correctPayAdjustment(
      { adjustmentId: adj.id, amount: "300.00" },
      admin(),
    );
    expect(corr.amount).toBe("-500.00");

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.deductions).toBe("300.00");
  });

  it("delta is vs. the CURRENT derived amount — a second correction stacks on the first", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Stack`,
      dailyRate: "1000.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "1000.00", date: "2026-06-02" },
      admin(),
    );
    await correctPayAdjustment({ adjustmentId: adj.id, amount: "1500.00" }, admin());
    const second = await correctPayAdjustment(
      { adjustmentId: adj.id, amount: "1800.00" },
      admin(),
    );
    expect(second.amount).toBe("300.00"); // 1800 − (1000 + 500)

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.advances).toBe("1800.00");
  });

  it("re-submitting the SAME final amount is idempotent — VALIDATION_ERROR, no row", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Idem`,
      dailyRate: "500.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "600.00", date: "2026-06-03" },
      admin(),
    );
    await expect(
      correctPayAdjustment({ adjustmentId: adj.id, amount: "600.00" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });

    const rows = await prisma.staffPayAdjustment.findMany({
      where: { staffId: id },
    });
    expect(rows).toHaveLength(1);
  });

  it("rejects correcting a correction (no chaining)", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} NoChain`,
      dailyRate: "500.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "400.00", date: "2026-06-06" },
      admin(),
    );
    const corr = await correctPayAdjustment(
      { adjustmentId: adj.id, amount: "700.00" },
      admin(),
    );
    await expect(
      correctPayAdjustment({ adjustmentId: corr.id, amount: "900.00" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "adjustmentId" });
    await expect(voidPayAdjustment(corr.id, admin())).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "adjustmentId",
    });
  });

  it("non-admin is FORBIDDEN for both correct and void", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Forbidden`,
      dailyRate: "500.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "400.00", date: "2026-06-07" },
      admin(),
    );
    const cashier = { actorId: ctx.adminId, role: "cashier" };
    await expect(
      correctPayAdjustment({ adjustmentId: adj.id, amount: "500.00" }, cashier),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(voidPayAdjustment(adj.id, cashier)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("NOT_FOUND for an unknown id; VALIDATION_ERROR for a non-positive corrected amount", async () => {
    await expect(
      correctPayAdjustment(
        { adjustmentId: "does-not-exist", amount: "100.00" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} BadAmt`,
      dailyRate: "500.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "400.00", date: "2026-06-08" },
      admin(),
    );
    await expect(
      correctPayAdjustment({ adjustmentId: adj.id, amount: "0" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("is NOT day-close gated — an Admin correction lands on a sealed day", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Sealed`,
      dailyRate: "500.00",
    });
    const day = "2026-04-15";
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "400.00", date: day },
      admin(),
    );
    await closeDay(day, ctx.adminId);
    try {
      const corr = await correctPayAdjustment(
        { adjustmentId: adj.id, amount: "550.00" },
        admin(),
      );
      expect(corr.amount).toBe("150.00");
    } finally {
      await reopenDay(day, ctx.adminId);
    }
  });

  it("void writes the negated derived magnitude, nets the folded figure to zero, and is once-only", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Void`,
      dailyRate: "1000.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "2000.00", date: "2026-06-11" },
      admin(),
    );
    await correctPayAdjustment({ adjustmentId: adj.id, amount: "2500.00" }, admin());

    const rev = await voidPayAdjustment(adj.id, admin());
    expect(rev.amount).toBe("-2500.00"); // negates 2000 + 500
    expect(rev.type).toBe("advance");
    await noMoneyMovementFor(rev.id);

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.advances).toBe("0.00");
    expect(pay.netPay).toBe("30000.00");
    expect(pay.adjustments).toHaveLength(1);
    expect(pay.adjustments[0].amount).toBe("0.00");
    expect(pay.adjustments[0].corrected).toBe(true);

    await expect(voidPayAdjustment(adj.id, admin())).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "adjustmentId",
    });
  });

  it("getPayrollSummary folds the correction into the per-row and total figures", async () => {
    const localCtx = await setupStaffWorld("correct-pay-adj-summary");
    try {
      const localAdmin = { actorId: localCtx.adminId, role: "admin" };
      const a = await makeBareStaff(localCtx, {
        name: `${localCtx.prefix} A`,
        dailyRate: "1000.00",
      });
      const adj = await recordPayAdjustment(
        { staffId: a, type: "advance", amount: "1000.00", date: "2026-06-05" },
        localAdmin,
      );
      await correctPayAdjustment(
        { adjustmentId: adj.id, amount: "1600.00" },
        localAdmin,
      );

      const summary = await getPayrollSummary("2026-06");
      const rowA = summary.rows.find((r) => r.staffId === a)!;
      expect(rowA.advances).toBe("1600.00");
      expect(rowA.adjustments).toHaveLength(1);
      expect(rowA.adjustments[0].amount).toBe("1600.00");

      const sum = (pick: (r: (typeof summary.rows)[number]) => string) =>
        summary.rows.reduce((acc, r) => acc + Number(pick(r)), 0).toFixed(2);
      expect(summary.totals.advances).toBe(sum((r) => r.advances));
      expect(summary.totals.netPay).toBe(sum((r) => r.netPay));
    } finally {
      await cleanupStaffTestData("correct-pay-adj-summary");
    }
  });

  it("writes an AuditLog correct row with oldValue + newValue sharing scalar keys", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Audit`,
      dailyRate: "500.00",
    });
    const adj = await recordPayAdjustment(
      { staffId: id, type: "deduction", amount: "300.00", date: "2026-06-09" },
      admin(),
    );
    await correctPayAdjustment({ adjustmentId: adj.id, amount: "450.00" }, admin());

    const log = await prisma.auditLog.findFirst({
      where: {
        entityType: "staff_pay_adjustment",
        entityId: adj.id,
        action: "correct",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    const oldV = log!.oldValue as Record<string, unknown>;
    const newV = log!.newValue as Record<string, unknown>;
    expect(oldV.type).toBe("Deduction");
    expect(oldV.amount).toBe("300.00");
    expect(newV.type).toBe("Deduction");
    expect(newV.amount).toBe("450.00");
    // shared scalar keys → /admin/audit-trail renders a real was→now table
    for (const k of Object.keys(oldV)) expect(k in newV).toBe(true);

    // void → soft_delete
    await voidPayAdjustment(adj.id, admin());
    const del = await prisma.auditLog.findFirst({
      where: {
        entityType: "staff_pay_adjustment",
        entityId: adj.id,
        action: "soft_delete",
      },
    });
    expect(del).not.toBeNull();
    expect((del!.newValue as Record<string, unknown>).voided).toBe(true);
  });
});
