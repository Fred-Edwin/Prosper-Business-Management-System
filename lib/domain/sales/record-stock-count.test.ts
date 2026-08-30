import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { recordStockCount, voidStockCount } from "./record-stock-count";
import {
  cleanupSalesTestData,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "stockcount";

const T0 = new Date("2026-08-20T06:00:00Z");
const T1 = new Date("2026-08-21T06:00:00Z");
const T2 = new Date("2026-08-22T06:00:00Z");
const T3 = new Date("2026-08-23T06:00:00Z");
const T4 = new Date("2026-08-24T06:00:00Z");
const T5 = new Date("2026-08-25T06:00:00Z");

describe("recordStockCount", () => {
  let ctx: CanteenTestCtx;
  let attendantCtx: {
    userId: string;
    role: "canteen_attendant";
    locationId: string;
  };

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    attendantCtx = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function canteenBalance(productId: string, asOf?: Date) {
    return (
      await getDerivedStockBalance({
        productId,
        locationId: ctx.canteenId,
        asOf,
      })
    ).quantity;
  }

  it("derives sold against a hand-worked ledger: opening 100 + transfer 20 − non-sale 5 − counted 80 = 35", async () => {
    const [soda] = ctx.products; // sellingPrice 60.00
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "transfer",
      quantity: "20",
      occurredAt: T1,
    });
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "non_sale_consumption",
      quantity: "-5",
      occurredAt: T2,
    });

    const { count, derivedSale } = await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T3 },
      attendantCtx,
    );

    expect(derivedSale.unitsSold).toBe("35.0000");
    expect(derivedSale.revenue).toBe("2100.00"); // 35 × 60
    expect(derivedSale.periodStart).toBeNull(); // first count
    expect(derivedSale.periodEnd).toBe(T3.toISOString());
    expect(count.countedQuantity).toBe("80.0000");

    // one `sale` StockMovement of -35 with the count linked
    const sales = await prisma.stockMovement.findMany({
      where: { stockCountId: count.id, movementType: "sale" },
    });
    expect(sales).toHaveLength(1);
    expect(sales[0].quantity.toString()).toBe("-35");
    expect(sales[0].occurredAt.toISOString()).toBe(T3.toISOString());

    // a +2100 canteen_sale MoneyMovement, account cash, sourceId = count id
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "canteen_sale", sourceId: count.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].account).toBe("cash");
    expect(mm[0].amount.toFixed(2)).toBe("2100.00");

    // closing = counted value, derived (ADR-11 — no stored row)
    expect(await canteenBalance(soda.id, T3)).toBe("80.0000");

    // AuditLog row
    const audit = await prisma.auditLog.findMany({
      where: { entityType: "stock_count", entityId: count.id, action: "create" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].newValue).toMatchObject({
      countedQuantity: "80.0000",
      sold: "35.0000",
      revenue: "2100.00",
    });
  });

  it("two counts with a gap: the second period does not double-count the first", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "transfer",
      quantity: "20",
      occurredAt: T1,
    });
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "non_sale_consumption",
      quantity: "-5",
      occurredAt: T2,
    });

    const first = await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T3 },
      attendantCtx,
    );
    expect(first.derivedSale.unitsSold).toBe("35.0000");

    // +10 transfer between the two counts
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "transfer",
      quantity: "10",
      occurredAt: T4,
    });

    const second = await recordStockCount(
      { productId: soda.id, countedQuantity: "15", occurredAt: T5 },
      attendantCtx,
    );

    // expectedRemaining at T5 = 80 + 10 = 90 ; sold = 90 − 15 = 75
    expect(second.derivedSale.unitsSold).toBe("75.0000");
    expect(second.derivedSale.revenue).toBe("4500.00");
    expect(second.derivedSale.periodStart).toBe(T3.toISOString());
    expect(second.derivedSale.periodEnd).toBe(T5.toISOString());

    const secondSale = await prisma.stockMovement.findFirst({
      where: { stockCountId: second.count.id, movementType: "sale" },
    });
    expect(secondSale?.quantity.toString()).toBe("-75");

    // closing after the second count = 15
    expect(await canteenBalance(soda.id, T5)).toBe("15.0000");

    // the two counts' cash revenue = 35×60 + 75×60 = 2100 + 4500 = 6600
    // (asserted on their own sourceIds — `getAccountBalances` is a global
    // sum and other suites write money rows in parallel).
    const mm = await prisma.moneyMovement.findMany({
      where: {
        sourceType: "canteen_sale",
        sourceId: { in: [first.count.id, second.count.id] },
      },
    });
    const revenueSum = mm.reduce(
      (acc, m) => acc.add(m.amount),
      new Prisma.Decimal(0),
    );
    expect(revenueSum.toFixed(2)).toBe("6600.00");
    expect(mm.every((m) => m.account === "cash")).toBe(true);
  });

  it("first-ever count: periodStart is null and the sum runs from the start of the ledger", async () => {
    const [, mandazi] = ctx.products; // sellingPrice 20.00
    await seedMovement(ctx, {
      productId: mandazi.id,
      movementType: "opening",
      quantity: "40",
      occurredAt: T0,
    });
    await seedMovement(ctx, {
      productId: mandazi.id,
      movementType: "non_sale_consumption",
      quantity: "-2",
      occurredAt: T1,
    });

    const { derivedSale } = await recordStockCount(
      { productId: mandazi.id, countedQuantity: "12", occurredAt: T2 },
      attendantCtx,
    );
    // 40 − 2 − 12 = 26
    expect(derivedSale.unitsSold).toBe("26.0000");
    expect(derivedSale.revenue).toBe("520.00");
    expect(derivedSale.periodStart).toBeNull();
  });

  it("closing stock equals the counted value exactly, for any count", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "144",
      occurredAt: T0,
    });
    const { count } = await recordStockCount(
      { productId: soda.id, countedQuantity: "96", occurredAt: T1 },
      attendantCtx,
    );
    expect(await canteenBalance(soda.id, count.occurredAt as unknown as Date)).toBe(
      "96.0000",
    );
    // also true "as of now"
    expect(await canteenBalance(soda.id)).toBe("96.0000");
  });

  it("revenue = sold × canteen price with exact Decimal (no float drift)", async () => {
    const [soda] = ctx.products;
    // Give this product a price with a fractional part.
    await prisma.productLocation.updateMany({
      where: { productId: soda.id, locationId: ctx.canteenId },
      data: { sellingPrice: new Prisma.Decimal("0.10") },
    });
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "3",
      occurredAt: T0,
    });
    const { derivedSale } = await recordStockCount(
      { productId: soda.id, countedQuantity: "0", occurredAt: T1 },
      attendantCtx,
    );
    // 3 × 0.10 = 0.30 exactly
    expect(derivedSale.unitsSold).toBe("3.0000");
    expect(derivedSale.revenue).toBe("0.30");
  });

  it("sold === 0: writes the StockCount + a zero `sale` row but no MoneyMovement", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "50",
      occurredAt: T0,
    });
    const { count, derivedSale } = await recordStockCount(
      { productId: soda.id, countedQuantity: "50", occurredAt: T1 },
      attendantCtx,
    );
    expect(derivedSale.unitsSold).toBe("0.0000");
    expect(derivedSale.revenue).toBe("0.00");

    const sale = await prisma.stockMovement.findFirst({
      where: { stockCountId: count.id, movementType: "sale" },
    });
    expect(sale?.quantity.toString()).toBe("0");

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "canteen_sale", sourceId: count.id },
    });
    expect(mm).toHaveLength(0);
  });

  it("counted MORE than expected → VALIDATION_ERROR, nothing written, balance unchanged", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "50",
      occurredAt: T0,
    });

    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "60", occurredAt: T1 },
        attendantCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "countedQuantity" });

    expect(await prisma.stockCount.count({ where: { productId: soda.id } })).toBe(0);
    expect(
      await prisma.stockMovement.count({
        where: { productId: soda.id, movementType: "sale" },
      }),
    ).toBe(0);
    expect(await canteenBalance(soda.id)).toBe("50.0000");
  });

  it("no credit path: no Debt (and no non-cash money row) is written by a count", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "10",
      occurredAt: T0,
    });
    const { count } = await recordStockCount(
      { productId: soda.id, countedQuantity: "4", occurredAt: T1 },
      attendantCtx,
    );
    // A Debt requires an Order (FK) — a canteen count creates no Order, so
    // no Debt can reference this canteen. (`prisma.debt.count()` is global
    // and races S4's order tests, so scope through the location.)
    const canteenDebts = await prisma.debt.count({
      where: { order: { locationId: ctx.canteenId } },
    });
    expect(canteenDebts).toBe(0);
    // the count's only money row is cash
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "canteen_sale", sourceId: count.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].account).toBe("cash");
  });

  it("count out of order (occurredAt before the previous count) → VALIDATION_ERROR", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T3 },
      attendantCtx,
    );
    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "70", occurredAt: T1 },
        attendantCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "occurredAt" });
  });

  it("product not sold at the canteen (no sellingPrice) → VALIDATION_ERROR", async () => {
    const [soda] = ctx.products;
    await prisma.productLocation.updateMany({
      where: { productId: soda.id, locationId: ctx.canteenId },
      data: { sellingPrice: null },
    });
    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "1", occurredAt: T1 },
        attendantCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "productId" });
  });

  it("negative countedQuantity → VALIDATION_ERROR", async () => {
    const [soda] = ctx.products;
    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "-1", occurredAt: T1 },
        attendantCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "countedQuantity" });
  });

  it("attendant with no canteen assignment → FORBIDDEN", async () => {
    const [soda] = ctx.products;
    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "1" },
        { userId: ctx.attendantId, role: "canteen_attendant", locationId: null },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("voidStockCount", () => {
  let ctx: CanteenTestCtx;
  let attendantCtx: {
    userId: string;
    role: "canteen_attendant";
    locationId: string;
  };

  beforeEach(async () => {
    ctx = await setupCanteenTestData("voidcount");
    attendantCtx = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
  });
  afterEach(async () => {
    await cleanupSalesTestData("voidcount");
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function canteenBalance(productId: string, asOf?: Date) {
    return (
      await getDerivedStockBalance({
        productId,
        locationId: ctx.canteenId,
        asOf,
      })
    ).quantity;
  }

  it("same-day undo hard-deletes the count, its sale movement and its money movement", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: new Date(Date.now() - 60_000),
    });

    const { count } = await recordStockCount(
      { productId: soda.id, countedQuantity: "70" }, // occurredAt defaults to now
      attendantCtx,
    );
    // the count's revenue row exists before the undo
    expect(
      await prisma.moneyMovement.count({
        where: { sourceType: "canteen_sale", sourceId: count.id },
      }),
    ).toBe(1);

    await voidStockCount(count.id, attendantCtx);

    // count, its sale movement and its money movement are all gone
    expect(await prisma.stockCount.count({ where: { id: count.id } })).toBe(0);
    expect(
      await prisma.stockMovement.count({ where: { stockCountId: count.id } }),
    ).toBe(0);
    expect(
      await prisma.moneyMovement.count({
        where: { sourceType: "canteen_sale", sourceId: count.id },
      }),
    ).toBe(0);
    // the canteen balance is back to the pre-count value
    expect(await canteenBalance(soda.id)).toBe("100.0000");

    // a hard_delete audit row remains
    const audit = await prisma.auditLog.findMany({
      where: { entityType: "stock_count", entityId: count.id, action: "hard_delete" },
    });
    expect(audit).toHaveLength(1);
  });

  it("another attendant's count → FORBIDDEN", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "10",
      occurredAt: new Date(Date.now() - 60_000),
    });
    const { count } = await recordStockCount(
      { productId: soda.id, countedQuantity: "4" },
      attendantCtx,
    );
    await expect(
      voidStockCount(count.id, {
        userId: ctx.adminId,
        role: "canteen_attendant",
        locationId: ctx.canteenId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a count dated to a previous day → FORBIDDEN (day closed)", async () => {
    const [soda] = ctx.products;
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: new Date(yesterday.getTime() - 60_000),
    });
    const { count } = await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: yesterday },
      attendantCtx,
    );
    await expect(voidStockCount(count.id, attendantCtx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    // still there
    expect(await prisma.stockCount.count({ where: { id: count.id } })).toBe(1);
  });

  it("unknown count id → NOT_FOUND", async () => {
    await expect(
      voidStockCount("00000000-0000-0000-0000-000000000000", attendantCtx),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
