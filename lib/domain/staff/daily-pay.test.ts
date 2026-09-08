import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { closeDay, reopenDay } from "@/lib/domain/audit";
import { getStaffPay } from "./pay";
import { correctDailyPay, recordDailyPay, voidDailyPay } from "./daily-pay";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "daily-pay";

/**
 * ADR-76 — the daily-entry pay model. `recordDailyPay` / `correctDailyPay`
 * / `voidDailyPay` write append-only `StaffDailyPay` rows and NO
 * `MoneyMovement` (a pay entry is not a cash event until a payout). These
 * tests assert the delta math + the folded `getStaffPay.grossPay`.
 *
 * Dates are in a PAST month relative to "now" so the day-close gate and
 * month arithmetic are deterministic. `2026-06` is safely in the past.
 */
describe("recordDailyPay / correctDailyPay / voidDailyPay", () => {
  let ctx: StaffTestCtx;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" });

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  async function dailyEntryStaff(name: string): Promise<string> {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} ${name}`,
      rosterOnly: true,
      dailyRate: "800.00",
    });
    await prisma.staff.update({
      where: { id },
      data: { payModel: "daily_entry" },
    });
    return id;
  }

  async function noMoneyMovementFor(sourceId: string) {
    const mm = await prisma.moneyMovement.findFirst({ where: { sourceId } });
    expect(mm).toBeNull();
  }

  it("records an entry, no MoneyMovement, and getStaffPay sums it into gross", async () => {
    const id = await dailyEntryStaff("Record");
    const e1 = await recordDailyPay(
      { staffId: id, amount: "900.00", date: "2026-06-01", note: "long shift" },
      admin(),
    );
    await recordDailyPay(
      { staffId: id, amount: "750.00", date: "2026-06-02" },
      admin(),
    );

    expect(e1.amount).toBe("900.00");
    await noMoneyMovementFor(e1.id);

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.payModel).toBe("daily_entry");
    expect(pay.grossPay).toBe("1650.00");
    expect(pay.netPay).toBe("1650.00");
    expect(pay.dailyPay).toHaveLength(2);
  });

  it("a fixed_daily_rate staff member is rejected", async () => {
    const id = await makeBareStaff(ctx, {
      name: `${ctx.prefix} FixedRate`,
      rosterOnly: true,
      dailyRate: "800.00",
    });
    await expect(
      recordDailyPay(
        { staffId: id, amount: "900.00", date: "2026-06-01" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "staffId" });
  });

  it("a second original entry for the same staff-day is CONFLICT", async () => {
    const id = await dailyEntryStaff("Dup");
    await recordDailyPay(
      { staffId: id, amount: "900.00", date: "2026-06-10" },
      admin(),
    );
    await expect(
      recordDailyPay(
        { staffId: id, amount: "500.00", date: "2026-06-10" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("correct nets a signed delta and getStaffPay folds it in", async () => {
    const id = await dailyEntryStaff("Correct");
    const e = await recordDailyPay(
      { staffId: id, amount: "900.00", date: "2026-06-05" },
      admin(),
    );

    const c = await correctDailyPay(
      { dailyPayId: e.id, amount: "1200.00" },
      admin(),
    );
    // The correction row carries the +300 signed delta.
    expect(c.amount).toBe("300.00");
    await noMoneyMovementFor(c.id);

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.grossPay).toBe("1200.00");
    // The list still shows one entry (the original), corrections folded.
    expect(pay.dailyPay).toHaveLength(1);
    expect(pay.dailyPay[0]).toMatchObject({
      amount: "1200.00",
      originalAmount: "900.00",
      corrected: true,
    });

    // A no-op re-correct to the current value is rejected (idempotent).
    await expect(
      correctDailyPay({ dailyPayId: e.id, amount: "1200.00" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("void reverses the entry to zero in gross", async () => {
    const id = await dailyEntryStaff("Void");
    const a = await recordDailyPay(
      { staffId: id, amount: "900.00", date: "2026-06-07" },
      admin(),
    );
    await recordDailyPay(
      { staffId: id, amount: "800.00", date: "2026-06-08" },
      admin(),
    );

    await voidDailyPay(a.id, admin());

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.grossPay).toBe("800.00");
    const voided = pay.dailyPay.find((d) => d.id === a.id);
    expect(voided?.amount).toBe("0.00");

    // Voiding again is rejected.
    await expect(voidDailyPay(a.id, admin())).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("correcting a correction row is rejected", async () => {
    const id = await dailyEntryStaff("NoChain");
    const e = await recordDailyPay(
      { staffId: id, amount: "900.00", date: "2026-06-12" },
      admin(),
    );
    const c = await correctDailyPay(
      { dailyPayId: e.id, amount: "1000.00" },
      admin(),
    );
    await expect(
      correctDailyPay({ dailyPayId: c.id, amount: "1100.00" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("recording is day-close gated; correcting and voiding are not", async () => {
    const id = await dailyEntryStaff("DayClose");
    const day = "2026-06-20";
    const e = await recordDailyPay(
      { staffId: id, amount: "900.00", date: day },
      admin(),
    );

    await closeDay(day, ctx.adminId);
    try {
      await expect(
        recordDailyPay({ staffId: id, amount: "500.00", date: day }, admin()),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      // An Admin correction / void row is always allowed, even on a closed day.
      const c = await correctDailyPay(
        { dailyPayId: e.id, amount: "1000.00" },
        admin(),
      );
      expect(c.amount).toBe("100.00");
      await voidDailyPay(e.id, admin());
    } finally {
      await reopenDay(day, ctx.adminId);
    }

    const pay = await getStaffPay(id, "2026-06");
    expect(pay.grossPay).toBe("0.00");
  });

  it("non-admin actors are refused", async () => {
    const id = await dailyEntryStaff("Auth");
    const notAdmin = { actorId: ctx.adminId, role: "cashier" };
    await expect(
      recordDailyPay(
        { staffId: id, amount: "900.00", date: "2026-06-25" },
        notAdmin,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      correctDailyPay({ dailyPayId: "x", amount: "1.00" }, notAdmin),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(voidDailyPay("x", notAdmin)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a non-positive or malformed amount", async () => {
    const id = await dailyEntryStaff("BadAmount");
    for (const amount of ["0", "-5.00", "abc", "1.234"]) {
      await expect(
        recordDailyPay(
          { staffId: id, amount, date: "2026-06-28" },
          admin(),
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
    }
  });

  it("keeps Decimal precision across many entries", async () => {
    const id = await dailyEntryStaff("Precision");
    for (let d = 1; d <= 5; d++) {
      await recordDailyPay(
        {
          staffId: id,
          amount: "333.33",
          date: `2026-07-0${d}`,
        },
        admin(),
      );
    }
    const pay = await getStaffPay(id, "2026-07");
    expect(pay.grossPay).toBe(new Prisma.Decimal("333.33").times(5).toFixed(2));
  });
});
