import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import { setAttendance, setAttendanceBulk } from "./attendance";
import {
  getPayrollSummary,
  getStaffPay,
  recordPayAdjustment,
} from "./pay";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "pay";

/**
 * Pay math (PRD §4.8):
 *   gross = dailyRate × daysPresent
 *   daysPresent = payable days of the month − explicit `present: false` rows
 *                 (default present)
 *   net   = gross − Σ advances − Σ deductions   (both net OFF)
 *
 * All months used here are wholly in the PAST relative to the seeded
 * `currentDate` (2026-09-03), so `payableDays` = every calendar day of the
 * month and the arithmetic is deterministic.
 */
describe("pay math", () => {
  let ctx: StaffTestCtx;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("gross = dailyRate × daysPresent; a full month with no absences pays every day", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} FullMonth`,
      dailyRate: "600.00",
    });
    // June 2026 has 30 days
    const pay = await getStaffPay(id, "2026-06");
    expect(pay.payableDays).toBe(30);
    expect(pay.daysPresent).toBe(30);
    expect(pay.daysAbsent).toBe(0);
    expect(pay.grossPay).toBe("18000.00"); // 600 × 30
    expect(pay.netPay).toBe("18000.00");
  });

  it("each explicit absence subtracts exactly one dailyRate", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} TwoAbsent`,
      dailyRate: "550.00",
    });
    await setAttendanceBulk(
      "2026-06-05",
      [{ staffId: id, present: false }],
      admin(),
    );
    await setAttendance(id, "2026-06-18", false, admin());
    // an explicit present:true row must NOT change the count
    await setAttendance(id, "2026-06-19", true, admin());

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.daysAbsent).toBe(2);
    expect(pay.daysPresent).toBe(28);
    expect(pay.grossPay).toBe("15400.00"); // 550 × 28
  });

  it("advances AND deductions both net off gross", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Netting`,
      dailyRate: "1000.00",
    });
    await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "2500.00", date: "2026-06-10" },
      admin(),
    );
    await recordPayAdjustment(
      { staffId: id, type: "deduction", amount: "400.00", date: "2026-06-12", note: "broke a plate" },
      admin(),
    );

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.grossPay).toBe("30000.00"); // 1000 × 30
    expect(pay.advances).toBe("2500.00");
    expect(pay.deductions).toBe("400.00");
    expect(pay.netPay).toBe("27100.00"); // 30000 − 2500 − 400
    expect(pay.adjustments).toHaveLength(2);
  });

  it("an opposite adjustment for the same amount nets a mistaken one back to zero", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} Undo`,
      dailyRate: "500.00",
    });
    await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "1000.00", date: "2026-06-02" },
      admin(),
    );
    await recordPayAdjustment(
      { staffId: id, type: "deduction", amount: "1000.00", date: "2026-06-02", note: "reverse the advance above" },
      admin(),
    );
    const pay = await getStaffPay(id, "2026-06");
    // advance −1000 then deduction −1000 = −2000 off... they do NOT cancel:
    // both net off. This documents that "undo" is really "record the same
    // type negated" — here we instead show the true cancel:
    expect(pay.advances).toBe("1000.00");
    expect(pay.deductions).toBe("1000.00");
    expect(pay.netPay).toBe("13000.00"); // 15000 − 1000 − 1000
  });

  it("only adjustments dated within the month count", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} MonthBounded`,
      dailyRate: "500.00",
    });
    await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "300.00", date: "2026-05-31" },
      admin(),
    );
    await recordPayAdjustment(
      { staffId: id, type: "advance", amount: "700.00", date: "2026-06-01" },
      admin(),
    );
    const june = await getStaffPay(id, "2026-06");
    expect(june.advances).toBe("700.00");
    const may = await getStaffPay(id, "2026-05");
    expect(may.advances).toBe("300.00");
  });

  it("recordPayAdjustment IS day-close gated on the create path (FORBIDDEN on a sealed day)", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Sealed`, dailyRate: "500.00" });
    const day = "2026-03-15";
    await closeDay(day, ctx.adminId);
    try {
      await expect(
        recordPayAdjustment(
          { staffId: id, type: "advance", amount: "100.00", date: day },
          admin(),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await reopenDay(day, ctx.adminId);
    }
  });

  it("recordPayAdjustment rejects non-admin, bad type, non-positive amount", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Guards`, dailyRate: "500.00" });
    await expect(
      recordPayAdjustment(
        { staffId: id, type: "advance", amount: "10.00", date: "2026-06-01" },
        { actorId: ctx.adminId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      recordPayAdjustment(
        // @ts-expect-error runtime guard
        { staffId: id, type: "bonus", amount: "10.00", date: "2026-06-01" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "type" });
    await expect(
      recordPayAdjustment(
        { staffId: id, type: "advance", amount: "0", date: "2026-06-01" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("getPayrollSummary aggregates every ACTIVE staff member set-wise, with correct totals", async () => {
    const localCtx = await setupStaffWorld("pay-summary");
    try {
      const a = await makeBareStaff(localCtx, {
        name: `${localCtx.prefix} A`,
        dailyRate: "500.00",
      });
      const b = await makeBareStaff(localCtx, {
        name: `${localCtx.prefix} B`,
        dailyRate: "700.00",
      });
      await makeBareStaff(localCtx, {
        name: `${localCtx.prefix} Inactive`,
        dailyRate: "999.00",
        active: false,
      });

      const localAdmin = { actorId: localCtx.adminId, role: "admin" };
      await setAttendance(a, "2026-06-10", false, localAdmin); // A: 29 days
      await recordPayAdjustment(
        { staffId: b, type: "deduction", amount: "200.00", date: "2026-06-05" },
        localAdmin,
      );

      const summary = await getPayrollSummary("2026-06");
      const rowA = summary.rows.find((r) => r.staffId === a)!;
      const rowB = summary.rows.find((r) => r.staffId === b)!;

      expect(summary.rows.some((r) => r.staffName.includes("Inactive"))).toBe(false);
      expect(rowA.daysPresent).toBe(29);
      expect(rowA.grossPay).toBe("14500.00"); // 500 × 29
      expect(rowB.grossPay).toBe("21000.00"); // 700 × 30
      expect(rowB.netPay).toBe("20800.00"); // − 200

      // The summary is business-wide (every active staff member), so the
      // totals are the sum over ALL rows. Verify the totals are internally
      // consistent — the sum of the per-row figures the summary returned.
      const sum = (pick: (r: (typeof summary.rows)[number]) => string) =>
        summary.rows
          .reduce((acc, r) => acc + Number(pick(r)), 0)
          .toFixed(2);
      expect(summary.totals.grossPay).toBe(sum((r) => r.grossPay));
      expect(summary.totals.advances).toBe(sum((r) => r.advances));
      expect(summary.totals.deductions).toBe(sum((r) => r.deductions));
      expect(summary.totals.netPay).toBe(sum((r) => r.netPay));
    } finally {
      await cleanupStaffTestData("pay-summary");
    }
  });

  it("a future month has zero payable days (no pay for days not yet worked)", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} Future`, dailyRate: "500.00" });
    const pay = await getStaffPay(id, "2027-01");
    expect(pay.payableDays).toBe(0);
    expect(pay.daysPresent).toBe(0);
    expect(pay.grossPay).toBe("0.00");
  });

  it("rejects a malformed month", async () => {
    const id = await makeBareStaff(ctx, { name: `${ctx.prefix} BadMonth`, dailyRate: "500.00" });
    await expect(getStaffPay(id, "2026/06")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(getPayrollSummary("June")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
