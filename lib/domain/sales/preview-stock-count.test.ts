import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { previewStockCount, recordStockCount } from "./record-stock-count";
import {
  cleanupSalesTestData,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

/**
 * F7-2 — the K1 preview must show the EXACT `sold` / `revenue` that a
 * subsequent `recordStockCount` will persist, and must write nothing.
 * `deriveStockCount` is the single shared calc both call.
 */

const SCOPE = "previewcount";

const T0 = new Date("2026-08-20T06:00:00Z");
const T1 = new Date("2026-08-21T06:00:00Z");
const T2 = new Date("2026-08-22T06:00:00Z");
const T3 = new Date("2026-08-23T06:00:00Z");
const T4 = new Date("2026-08-24T06:00:00Z");
const T5 = new Date("2026-08-25T06:00:00Z");

describe("previewStockCount", () => {
  let ctx: CanteenTestCtx;
  // Role `"admin"`: this suite backdates the counts it previews / records
  // to historical fixture dates (T2…), which ADR-53 makes an Admin-only
  // action. `previewStockCount` / `recordStockCount` gate on
  // `ctx.locationId`, not role. The "no location → FORBIDDEN" case below
  // passes its own explicit `canteen_attendant` ctx.
  let attendant: {
    userId: string;
    role: "admin";
    locationId: string;
  };

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    attendant = {
      userId: ctx.attendantId,
      role: "admin",
      locationId: ctx.canteenId,
    };
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Row counts scoped to THIS suite's product / attendant — never a global
   * aggregate (parallel suites hold `canteen_sale` rows concurrently).
   */
  async function rowCounts(productId: string) {
    const countIds = (
      await prisma.stockCount.findMany({
        where: { productId },
        select: { id: true },
      })
    ).map((c) => c.id);
    const [counts, sales, money, audit] = await Promise.all([
      prisma.stockCount.count({ where: { productId } }),
      prisma.stockMovement.count({
        where: { productId, movementType: "sale" },
      }),
      countIds.length
        ? prisma.moneyMovement.count({
            where: { sourceType: "canteen_sale", sourceId: { in: countIds } },
          })
        : Promise.resolve(0),
      prisma.auditLog.count({
        where: { entityType: "stock_count", userId: ctx.attendantId },
      }),
    ]);
    return { counts, sales, money, audit };
  }

  it("preview equals what recordStockCount then persists — across a period boundary — to the cent, and writes nothing", async () => {
    const [soda] = ctx.products; // sellingPrice 60.00
    const price = 60;

    // opening 200 (Aug 20).
    await seedMovement(ctx, { productId: soda.id, movementType: "opening", quantity: "200", occurredAt: T0 });

    // COUNT 1 — Aug 22, shelf 150 ⇒ sold 50.
    await recordStockCount(
      { productId: soda.id, countedQuantity: "150", occurredAt: T2 },
      attendant,
    );

    // Between count 1 and count 2: +40 transfer, +25 production, −7 non-sale.
    await seedMovement(ctx, { productId: soda.id, movementType: "transfer", quantity: "40", occurredAt: T3 });
    await seedMovement(ctx, { productId: soda.id, movementType: "production", quantity: "25", occurredAt: T4 });
    await seedMovement(ctx, { productId: soda.id, movementType: "non_sale_consumption", quantity: "-7", occurredAt: T4 });

    // COUNT 2 candidate — Aug 25, shelf 96.
    //   150 + 65 − 7 − 96 = 112 sold; revenue 6720.00.
    const before = await rowCounts(soda.id);
    const preview = await previewStockCount(
      { productId: soda.id, countedRemaining: "96", occurredAt: T5 },
      attendant,
    );

    expect(preview.blocked).toBe(false);
    expect(preview.isFirstCount).toBe(false);
    expect(preview.unitsSold).toBe("112.0000");
    expect(preview.revenue).toBe((112 * price).toFixed(2)); // 6720.00
    expect(preview.closingStockWillBe).toBe("96.0000");
    expect(preview.periodStart).toBe(T2.toISOString());
    expect(preview.lastCountedAt).toBe(T2.toISOString());
    expect(preview.daysSincePrevious).toBe(3);

    // NOTHING was written by the preview.
    const after = await rowCounts(soda.id);
    expect(after).toEqual(before);

    // Now actually record with the SAME inputs — the figures match exactly.
    const { derivedSale } = await recordStockCount(
      { productId: soda.id, countedQuantity: "96", occurredAt: T5 },
      attendant,
    );
    expect(derivedSale.unitsSold).toBe(preview.unitsSold);
    expect(derivedSale.revenue).toBe(preview.revenue);
    expect(derivedSale.periodStart).toBe(preview.periodStart);
  });

  it("first-ever count: isFirstCount true, periodStart null, daysSincePrevious null, sold runs from the ledger start", async () => {
    const [soda] = ctx.products;
    // opening 40, non-sale 2, nothing else. counted 12 ⇒ sold 26.
    await seedMovement(ctx, { productId: soda.id, movementType: "opening", quantity: "40", occurredAt: T0 });
    await seedMovement(ctx, { productId: soda.id, movementType: "non_sale_consumption", quantity: "-2", occurredAt: T1 });

    const preview = await previewStockCount(
      { productId: soda.id, countedRemaining: "12", occurredAt: T2 },
      attendant,
    );
    expect(preview.blocked).toBe(false);
    expect(preview.isFirstCount).toBe(true);
    expect(preview.periodStart).toBeNull();
    expect(preview.lastCountedAt).toBeNull();
    expect(preview.daysSincePrevious).toBeNull();
    expect(preview.unitsSold).toBe("26.0000");
    expect(preview.revenue).toBe("1560.00"); // 26 × 60

    // matches the real record
    const { derivedSale } = await recordStockCount(
      { productId: soda.id, countedQuantity: "12", occurredAt: T2 },
      attendant,
    );
    expect(derivedSale.unitsSold).toBe(preview.unitsSold);
    expect(derivedSale.revenue).toBe(preview.revenue);
    expect(derivedSale.periodStart).toBeNull();
  });

  it("counted MORE than expected → blocked:true + exceedsExpectedBy, nothing written; recordStockCount rejects the same input", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, { productId: soda.id, movementType: "opening", quantity: "100", occurredAt: T0 });

    const before = await rowCounts(soda.id);
    const preview = await previewStockCount(
      { productId: soda.id, countedRemaining: "112", occurredAt: T2 },
      attendant,
    );
    expect(preview.blocked).toBe(true);
    expect(preview.exceedsExpectedBy).toBe("12.0000");
    expect(preview.unitsSold).toBeNull();
    expect(preview.revenue).toBeNull();
    // closing is still echoed (the count field is what it is)
    expect(preview.closingStockWillBe).toBe("112.0000");

    const after = await rowCounts(soda.id);
    expect(after).toEqual(before);

    // the real path rejects the identical input, still nothing written
    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "112", occurredAt: T2 },
        attendant,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await rowCounts(soda.id)).toEqual(before);
  });

  it("validation parity: unknown product → NOT_FOUND; product not sold at the canteen → VALIDATION_ERROR; blank count → VALIDATION_ERROR", async () => {
    const [soda] = ctx.products;
    await expect(
      previewStockCount(
        { productId: "does-not-exist", countedRemaining: "5" },
        attendant,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // a product with no active canteen ProductLocation
    const orphan = await prisma.product.create({
      data: { name: `${ctx.prefix} Orphan`, kind: "goods", unitLabel: "pcs" },
    });
    await expect(
      previewStockCount(
        { productId: orphan.id, countedRemaining: "5" },
        attendant,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      previewStockCount(
        { productId: soda.id, countedRemaining: "" },
        attendant,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("attendant with no canteen assignment → FORBIDDEN", async () => {
    const [soda] = ctx.products;
    await expect(
      previewStockCount(
        { productId: soda.id, countedRemaining: "5" },
        { userId: ctx.attendantId, role: "canteen_attendant", locationId: null },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
