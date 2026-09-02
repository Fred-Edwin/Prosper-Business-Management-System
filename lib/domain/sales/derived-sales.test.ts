import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordStockCount } from "./record-stock-count";
import { getDerivedSalesForProduct, listDerivedSales } from "./derived-sales";
import {
  cleanupSalesTestData,
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
});
