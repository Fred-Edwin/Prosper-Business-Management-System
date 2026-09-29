import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addBusinessDays, businessDateLastInstantUtc, nairobiToday } from "@/lib/time";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { correctMovement } from "@/lib/domain/stock/correct-movement";
import { getFinancialSummary } from "@/lib/domain/financials";
import { dailyNetSeries } from "@/lib/domain/dashboard/trend-series";
import { DomainError } from "./errors";
import { adjustSold } from "./adjust-sold";
import { listSaleAdjustments } from "./list-sale-adjustments";
import {
  cleanupSalesTestData,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "adjustsold";
// A date no other suite writes on — the trend read sums every location.
const DAY = "2025-11-19";

describe("adjustSold (ADR-92)", () => {
  let ctx: CanteenTestCtx;
  let admin: { userId: string; role: "admin" };

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    admin = { userId: ctx.adminId, role: "admin" };
    const [soda] = ctx.products; // sellingPrice 60.00
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "50",
      occurredAt: new Date("2025-11-01T06:00:00Z"),
    });
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  function canteenRevenue(summary: Awaited<ReturnType<typeof getFinancialSummary>>) {
    return summary.perLocation.find((l) => l.locationId === ctx.canteenId)?.revenue ?? "0.00";
  }

  it("non-admin: FORBIDDEN", async () => {
    const [soda] = ctx.products;
    await expect(
      adjustSold(
        { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY, correctedSold: "5" },
        { userId: ctx.attendantId, role: "canteen_attendant" },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
  });

  it("raising Sold writes a source-less sale row and matching Cash revenue, both on that day", async () => {
    const [soda] = ctx.products;
    const r = await adjustSold(
      { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY, correctedSold: "5" },
      admin,
    );
    expect(r).toMatchObject({
      sold: "5.0000",
      quantityDelta: "5.0000",
      revenueDelta: "300.00",
      unitPrice: "60.00",
    });

    const row = await prisma.stockMovement.findUniqueOrThrow({ where: { id: r.stockMovementId } });
    expect(row.movementType).toBe("sale");
    expect(row.quantity.toFixed(4)).toBe("-5.0000");
    expect(row.orderId).toBeNull();
    expect(row.stockCountId).toBeNull();
    expect(row.customerId).toBeNull();
    expect(row.correctsMovementId).toBeNull();
    expect(row.occurredAt.getTime()).toBe(businessDateLastInstantUtc(DAY).getTime());

    const money = await prisma.moneyMovement.findFirstOrThrow({
      where: { stockMovementId: r.stockMovementId },
    });
    expect(money.sourceType).toBe("sale_adjustment");
    expect(money.account).toBe("cash");
    expect(money.amount.toFixed(2)).toBe("300.00");
    expect(money.occurredAt.getTime()).toBe(row.occurredAt.getTime());

    const balance = await getDerivedStockBalance({ productId: soda.id, locationId: ctx.canteenId });
    expect(balance.quantity).toBe("45.0000");

    expect(canteenRevenue(await getFinancialSummary(DAY, DAY))).toBe("300.00");
    // The dashboard trend reads the same revenue (it must equal the summary).
    const [trendDay] = await dailyNetSeries(DAY, DAY);
    expect(trendDay.revenue.toFixed(2)).toBe("300.00");

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityType: "sale_adjustment", entityId: r.stockMovementId },
    });
    expect(audit.oldValue).toMatchObject({ sold: "0.0000" });
    expect(audit.newValue).toMatchObject({ sold: "5.0000" });
  });

  it("measures against the day's existing sales and can lower Sold (negative revenue)", async () => {
    const [soda] = ctx.products;
    // An existing sale of 8 that day (as a count or order would write).
    await prisma.stockMovement.create({
      data: {
        productId: soda.id,
        locationId: ctx.canteenId,
        movementType: "sale",
        quantity: new Prisma.Decimal("-8"),
        recordedById: ctx.attendantId,
        occurredAt: new Date("2025-11-19T09:00:00Z"),
      },
    });

    const r = await adjustSold(
      { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY, correctedSold: "6" },
      admin,
    );
    expect(r.quantityDelta).toBe("-2.0000");
    expect(r.revenueDelta).toBe("-120.00");

    const balance = await getDerivedStockBalance({ productId: soda.id, locationId: ctx.canteenId });
    expect(balance.quantity).toBe("44.0000"); // 50 − 8 + 2

    expect(canteenRevenue(await getFinancialSummary(DAY, DAY))).toBe("-120.00");
  });

  it("re-entering a total restates from the current figure; entering the original undoes it", async () => {
    const [soda] = ctx.products;
    const input = { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY };
    await adjustSold({ ...input, correctedSold: "5" }, admin);
    const second = await adjustSold({ ...input, correctedSold: "2" }, admin);
    expect(second.quantityDelta).toBe("-3.0000");
    expect(second.revenueDelta).toBe("-180.00");
    expect(canteenRevenue(await getFinancialSummary(DAY, DAY))).toBe("120.00");

    await adjustSold({ ...input, correctedSold: "0" }, admin);
    const balance = await getDerivedStockBalance({ productId: soda.id, locationId: ctx.canteenId });
    expect(balance.quantity).toBe("50.0000");
    expect(canteenRevenue(await getFinancialSummary(DAY, DAY))).toBe("0.00");
  });

  it("same total as current: VALIDATION_ERROR, nothing written", async () => {
    const [soda] = ctx.products;
    await expect(
      adjustSold(
        { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY, correctedSold: "0" },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "correctedSold" });
  });

  it("future date and negative Sold are rejected", async () => {
    const [soda] = ctx.products;
    const base = { productId: soda.id, locationId: ctx.canteenId };
    await expect(
      adjustSold({ ...base, businessDate: addBusinessDays(nairobiToday(), 1), correctedSold: "1" }, admin),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "businessDate" });
    await expect(
      adjustSold({ ...base, businessDate: DAY, correctedSold: "-1" }, admin),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "correctedSold" });
  });

  it("today's adjustment is dated now, not end of day", async () => {
    const [soda] = ctx.products;
    const before = Date.now();
    const r = await adjustSold(
      { productId: soda.id, locationId: ctx.canteenId, businessDate: nairobiToday(), correctedSold: "1" },
      admin,
    );
    const row = await prisma.stockMovement.findUniqueOrThrow({ where: { id: r.stockMovementId } });
    expect(row.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(row.occurredAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("product with no selling price at the location: VALIDATION_ERROR", async () => {
    const unpriced = await prisma.product.create({
      data: { name: `${ctx.prefix} Unpriced`, kind: "goods", unitLabel: "pcs" },
    });
    await expect(
      adjustSold(
        { productId: unpriced.id, locationId: ctx.canteenId, businessDate: DAY, correctedSold: "1" },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "productId" });
  });

  it("the generic stock correction refuses sale rows (would move stock without revenue)", async () => {
    const [soda] = ctx.products;
    const r = await adjustSold(
      { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY, correctedSold: "5" },
      admin,
    );
    await expect(
      correctMovement(
        { movementId: r.stockMovementId, correctedQuantity: "-9", recordedById: ctx.adminId },
        { userId: ctx.adminId, role: "admin", locationId: null },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "movementId" });
  });
  describe("listSaleAdjustments", () => {
    it("lists the day's adjustments newest first with signed units and revenue, summing to Financials", async () => {
      const [soda] = ctx.products;
      const input = { productId: soda.id, locationId: ctx.canteenId, businessDate: DAY };
      await adjustSold({ ...input, correctedSold: "5", note: "forgot 5 sodas" }, admin);
      await adjustSold({ ...input, correctedSold: "2" }, admin);

      const rows = (await listSaleAdjustments({ from: DAY, to: DAY }, admin)).filter(
        (r) => r.productId === soda.id,
      );
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => [r.unitsSold, r.revenue])).toEqual(
        expect.arrayContaining([
          ["5.0000", "300.00"],
          ["-3.0000", "-180.00"],
        ]),
      );
      expect(rows[0]).toMatchObject({
        businessDate: DAY,
        locationId: ctx.canteenId,
        locationType: "canteen",
        unitLabel: "pcs",
      });
      expect(rows.find((r) => r.unitsSold === "5.0000")?.note).toBe("forgot 5 sodas");

      const total = rows.reduce((s, r) => s + Number(r.revenue), 0);
      expect(total.toFixed(2)).toBe(canteenRevenue(await getFinancialSummary(DAY, DAY)));
    });

    it("non-admin: FORBIDDEN", async () => {
      await expect(
        listSaleAdjustments({ from: DAY, to: DAY }, { userId: ctx.attendantId, role: "canteen_attendant" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
