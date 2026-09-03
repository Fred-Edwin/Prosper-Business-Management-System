import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateStartUtc } from "@/lib/time";
import { getMonthlyShortfalls } from "./shortfalls";
import {
  cleanupStaffTestData,
  makeBareStaff,
  setupStaffWorld,
  type StaffTestCtx,
} from "./test-helpers";

const SCOPE = "shortfalls";

/**
 * `getMonthlyShortfalls` (M4 S9B) — READ-ONLY, and the amount is DERIVED
 * from the receipt's stored negative variances, no schema column. It must
 * never touch pay.
 */
describe("getMonthlyShortfalls", () => {
  let ctx: StaffTestCtx;
  let staffId: string;

  async function raiseShortfall(opts: {
    businessDate: string;
    cashVariance: string;
    mpesaVariance: string;
    note: string;
  }): Promise<void> {
    const handover = await prisma.handover.create({
      data: {
        staffId,
        locationId: ctx.locationAId,
        cashDeclared: new Prisma.Decimal("1000.00"),
        mpesaDeclared: new Prisma.Decimal("0.00"),
        occurredAt: businessDateStartUtc(opts.businessDate),
      },
    });
    await prisma.receiptOfHandover.create({
      data: {
        handoverId: handover.id,
        cashReceived: new Prisma.Decimal("0.00"),
        mpesaReceived: new Prisma.Decimal("0.00"),
        cashVariance: new Prisma.Decimal(opts.cashVariance),
        mpesaVariance: new Prisma.Decimal(opts.mpesaVariance),
        recordedById: ctx.adminId,
        occurredAt: businessDateStartUtc(opts.businessDate),
        shortfalls: { create: { staffId, note: opts.note } },
      },
    });
  }

  beforeAll(async () => {
    ctx = await setupStaffWorld(SCOPE);
    staffId = await makeBareStaff(ctx, { name: `${ctx.prefix} Short` });
    // Two in August, one in July (out of range).
    await raiseShortfall({
      businessDate: "2026-08-12",
      cashVariance: "-300.00",
      mpesaVariance: "0.00",
      note: "Till short at evening handover",
    });
    await raiseShortfall({
      businessDate: "2026-08-24",
      cashVariance: "-100.00",
      mpesaVariance: "-50.00",
      note: "M-Pesa float mismatch",
    });
    await raiseShortfall({
      businessDate: "2026-07-30",
      cashVariance: "-999.00",
      mpesaVariance: "0.00",
      note: "Previous month — must not appear",
    });
  });
  afterAll(async () => {
    await cleanupStaffTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("returns only the month's entries, amount = |negative variance| summed", async () => {
    const res = await getMonthlyShortfalls("2026-08");
    const mine = res.entries.filter((e) => e.staffId === staffId);
    expect(mine).toHaveLength(2);
    expect(mine.map((e) => e.amount).sort()).toEqual(["150.00", "300.00"]);
    expect(mine[0].date).toBe("2026-08-12");
    expect(mine[0].note).toBe("Till short at evening handover");
  });

  it("sums a month total and counts the entries", async () => {
    const res = await getMonthlyShortfalls("2026-08");
    // Only this suite's staff have shortfalls under the test prefix; other
    // suites clean up their own, but assert on our slice to stay isolated.
    const mine = res.entries.filter((e) => e.staffId === staffId);
    const total = mine.reduce((s, e) => s + Number(e.amount), 0);
    expect(total).toBe(450);
  });

  it("rejects a malformed month", async () => {
    await expect(getMonthlyShortfalls("2026-8")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "month",
    });
  });
});
