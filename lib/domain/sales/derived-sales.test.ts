import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordStockCount } from "./record-stock-count";
import { recordCanteenCreditSale } from "./record-canteen-credit-sale";
import { voidCanteenCreditSale } from "./void-canteen-credit-sale";
import { getDerivedSalesForProduct, listDerivedSales } from "./derived-sales";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "derivedsales";

const T0 = new Date("2026-08-20T06:00:00Z");
const T1 = new Date("2026-08-21T06:00:00Z");
const T2 = new Date("2026-08-22T06:00:00Z");

describe("getDerivedSalesForProduct / listDerivedSales", () => {
  let ctx: CanteenTestCtx;
  // `recordCtx` writes the historical counts this suite's reads are
  // derived from. Post-ADR-53 a backdated count is Admin-only, so its
  // role is `"admin"` (the stock-count domain gates on `locationId`, not
  // role). `attendantCtx` below is the real attendant identity, used only
  // for the read-scoping assertions.
  let recordCtx: {
    userId: string;
    role: "admin";
    locationId: string;
  };
  let attendantCtx: {
    userId: string;
    role: "canteen_attendant";
    locationId: string;
  };
  let adminCtx: { userId: string; role: "admin"; locationId: null };

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    recordCtx = {
      userId: ctx.attendantId,
      role: "admin",
      locationId: ctx.canteenId,
    };
    attendantCtx = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
    adminCtx = { userId: ctx.adminId, role: "admin", locationId: null };
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedTwoCounts() {
    const [soda] = ctx.products; // price 60
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T1 },
      recordCtx,
    );
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "transfer",
      quantity: "10",
      occurredAt: new Date("2026-08-21T12:00:00Z"),
    });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "15", occurredAt: T2 },
      recordCtx,
    );
    return soda;
  }

  it("returns the most-recent count's figures with the previous count as periodStart", async () => {
    const soda = await seedTwoCounts();

    const view = await getDerivedSalesForProduct(soda.id, adminCtx);
    expect(view.productId).toBe(soda.id);
    expect(view.lastCountedAt).toBe(T2.toISOString());
    expect(view.periodStart).toBe(T1.toISOString());
    expect(view.periodEnd).toBe(T2.toISOString());
    // second period: (80 + 10) − 15 = 75 ; 75 × 60 = 4500
    expect(view.unitsSold).toBe("75.0000");
    expect(view.revenue).toBe("4500.00");
    expect(view.stockCountId).toBeDefined();
    expect(typeof view.stockCountId).toBe("string");
  });

  it("a never-counted canteen product comes back with null figures (not an error)", async () => {
    const [, mandazi] = ctx.products;
    const view = await getDerivedSalesForProduct(mandazi.id, adminCtx);
    expect(view.lastCountedAt).toBeNull();
    expect(view.periodStart).toBeNull();
    expect(view.unitsSold).toBeNull();
    expect(view.revenue).toBeNull();
    expect(view.stockCountId).toBeNull();
  });

  it("unknown product → NOT_FOUND", async () => {
    await expect(
      getDerivedSalesForProduct("00000000-0000-0000-0000-000000000000", adminCtx),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("listDerivedSales: all canteen products, newest count first, never-counted last", async () => {
    const soda = await seedTwoCounts();

    const rows = await listDerivedSales({}, adminCtx);
    const mine = rows.filter((r) => r.productId === soda.id || r.productName.startsWith(ctx.prefix));
    // both fixture products present
    expect(mine.map((r) => r.productId)).toContain(soda.id);
    const sodaRow = mine.find((r) => r.productId === soda.id)!;
    const mandaziRow = mine.find((r) => r.productId !== soda.id)!;
    expect(sodaRow.unitsSold).toBe("75.0000");
    expect(mandaziRow.lastCountedAt).toBeNull();
    // counted row sorts before the never-counted one
    expect(mine.indexOf(sodaRow)).toBeLessThan(mine.indexOf(mandaziRow));
  });

  it("listDerivedSales: productId filter narrows to one product", async () => {
    const soda = await seedTwoCounts();
    const rows = await listDerivedSales({ productId: soda.id }, adminCtx);
    expect(rows).toHaveLength(1);
    expect(rows[0].productId).toBe(soda.id);
  });

  it("listDerivedSales: date filter windows on the count's occurredAt", async () => {
    const soda = await seedTwoCounts();
    // T1 = 2026-08-21 ; the count on that Nairobi business day is the first (sold 20)
    const rows = await listDerivedSales({ date: "2026-08-21" }, adminCtx);
    const sodaRow = rows.find((r) => r.productId === soda.id)!;
    // first period: 100 − 80 = 20
    expect(sodaRow.unitsSold).toBe("20.0000");
    expect(sodaRow.periodEnd).toBe(T1.toISOString());
  });

  it("listDerivedSales: from/to windows an inclusive range and takes precedence over date", async () => {
    const soda = await seedTwoCounts();
    // Range covering both T1 (08-21) and T2 (08-22) → the latest count in
    // range wins, same as an unfiltered read.
    const rangeRows = await listDerivedSales(
      { from: "2026-08-21", to: "2026-08-22" },
      adminCtx,
    );
    const sodaInRange = rangeRows.find((r) => r.productId === soda.id)!;
    expect(sodaInRange.unitsSold).toBe("75.0000");
    expect(sodaInRange.periodEnd).toBe(T2.toISOString());

    // A stale `date` is ignored once from/to is given.
    const bothGiven = await listDerivedSales(
      { date: "2019-01-01", from: "2026-08-21", to: "2026-08-22" },
      adminCtx,
    );
    const sodaBothGiven = bothGiven.find((r) => r.productId === soda.id)!;
    expect(sodaBothGiven.unitsSold).toBe("75.0000");
  });

  it("canteen_attendant sees their own canteen; another role → FORBIDDEN", async () => {
    await seedTwoCounts();
    const rows = await listDerivedSales({}, attendantCtx);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    await expect(
      listDerivedSales({}, {
        userId: ctx.storeManagerId,
        role: "store_manager",
        locationId: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("canteen_attendant with no location → FORBIDDEN", async () => {
    await expect(
      listDerivedSales({}, {
        userId: ctx.attendantId,
        role: "canteen_attendant",
        locationId: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // ── ADR-91 fold-in ──────────────────────────────────────────────────

  it("folds a canteen credit sale's units/revenue into the count period it falls within", async () => {
    const [soda] = ctx.products; // price 60
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T1 },
      recordCtx,
    );
    // A credit sale between T1 and T2 — 5 units, 300.00 owed.
    const customerId = await makeCustomer(ctx);
    await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "5", occurredAt: new Date("2026-08-21T18:00:00Z") },
      { userId: ctx.attendantId, role: "admin", locationId: ctx.canteenId },
    );
    // Counted remaining reflects the credit sale already having left the
    // shelf: 80 (post-T1 remaining) − 5 (credit sale) − 5 (cash sold) = 70.
    await recordStockCount(
      { productId: soda.id, countedQuantity: "70", occurredAt: T2 },
      recordCtx,
    );

    const view = await getDerivedSalesForProduct(soda.id, adminCtx);
    // count-derived: 80 − 70 = 10 units, but 5 of those left via the
    // credit sale's own StockMovement — so the count-linked `sale` row
    // only accounts for 5 units (80 − 5 credit − 70 counted = 5), and the
    // credit sale contributes its own 5 on top.
    expect(view.unitsSold).toBe("10.0000");
    // revenue = 5 cash-sold × 60 (count) + 5 credit-sold × 60 (debt) = 600
    expect(view.revenue).toBe("600.00");
  });

  it("a voided credit sale nets out of the folded figure", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T1 },
      recordCtx,
    );
    const customerId = await makeCustomer(ctx);
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "5", occurredAt: new Date("2026-08-21T18:00:00Z") },
      { userId: ctx.attendantId, role: "admin", locationId: ctx.canteenId },
    );
    await voidCanteenCreditSale(sale.stockMovement.id, {
      userId: ctx.attendantId,
      role: "admin",
      locationId: ctx.canteenId,
    });
    // Stock is back to 80 after the void, so a count of 80 means nothing sold.
    await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T2 },
      recordCtx,
    );

    const view = await getDerivedSalesForProduct(soda.id, adminCtx);
    expect(view.unitsSold).toBe("0.0000");
    expect(view.revenue).toBe("0.00");
  });

  it("a credit sale after the latest count does not appear until the next count closes the period", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "80", occurredAt: T1 },
      recordCtx,
    );
    const customerId = await makeCustomer(ctx);
    await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      { userId: ctx.attendantId, role: "canteen_attendant", locationId: ctx.canteenId },
    );

    const view = await getDerivedSalesForProduct(soda.id, adminCtx);
    // Still reflects only the T1 count — the credit sale hasn't been
    // folded into a period yet (no later count exists).
    expect(view.lastCountedAt).toBe(T1.toISOString());
    expect(view.unitsSold).toBe("20.0000"); // 100 - 80, unrelated to the credit sale
  });
});
