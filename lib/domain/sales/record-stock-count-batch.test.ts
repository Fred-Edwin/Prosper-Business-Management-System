import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { recordStockCountBatch } from "./record-stock-count";
import {
  cleanupSalesTestData,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

// K1 multi-row count (client UX request, 2026-09-14): several products
// counted in one atomic submit instead of a round trip per product.
// Reuses the SAME per-line derivation as `recordStockCount` — coverage
// here is the batch-specific behaviour (all-or-nothing, empty/duplicate
// rejection); the derivation math itself is `record-stock-count.test.ts`.

const SCOPE = "stockcountbatch";
const T0 = new Date("2026-08-20T06:00:00Z");

describe("recordStockCountBatch", () => {
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

  async function canteenBalance(productId: string) {
    return (
      await getDerivedStockBalance({ productId, locationId: ctx.canteenId })
    ).quantity;
  }

  it("writes independent counts for two products in one transaction", async () => {
    const [soda, mandazi] = ctx.products; // sellingPrice 60.00 / 20.00
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await seedMovement(ctx, {
      productId: mandazi.id,
      movementType: "opening",
      quantity: "40",
      occurredAt: T0,
    });

    const results = await recordStockCountBatch(
      {
        lines: [
          { productId: soda.id, countedQuantity: "80" },
          { productId: mandazi.id, countedQuantity: "12" },
        ],
      },
      attendantCtx,
    );

    expect(results).toHaveLength(2);
    expect(results[0].derivedSale.unitsSold).toBe("20.0000");
    expect(results[0].derivedSale.revenue).toBe("1200.00");
    expect(results[1].derivedSale.unitsSold).toBe("28.0000");
    expect(results[1].derivedSale.revenue).toBe("560.00");

    expect(await canteenBalance(soda.id)).toBe("80.0000");
    expect(await canteenBalance(mandazi.id)).toBe("12.0000");

    expect(
      await prisma.stockCount.count({
        where: { id: { in: [results[0].count.id, results[1].count.id] } },
      }),
    ).toBe(2);
  });

  it("one line over expected stock rejects the WHOLE batch, nothing written", async () => {
    const [soda, mandazi] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "100",
      occurredAt: T0,
    });
    await seedMovement(ctx, {
      productId: mandazi.id,
      movementType: "opening",
      quantity: "40",
      occurredAt: T0,
    });

    await expect(
      recordStockCountBatch(
        {
          lines: [
            { productId: soda.id, countedQuantity: "80" }, // valid
            { productId: mandazi.id, countedQuantity: "999" }, // over
          ],
        },
        attendantCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    // the valid line was NOT written either — the whole batch is atomic
    expect(await prisma.stockCount.count({ where: { productId: soda.id } })).toBe(
      0,
    );
    expect(await canteenBalance(soda.id)).toBe("100.0000");
    expect(await canteenBalance(mandazi.id)).toBe("40.0000");
  });

  it("empty lines → VALIDATION_ERROR, field lines", async () => {
    await expect(
      recordStockCountBatch({ lines: [] }, attendantCtx),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });

  it("duplicate productId across lines → VALIDATION_ERROR, field lines", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "10",
      occurredAt: T0,
    });
    await expect(
      recordStockCountBatch(
        {
          lines: [
            { productId: soda.id, countedQuantity: "5" },
            { productId: soda.id, countedQuantity: "6" },
          ],
        },
        attendantCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });

  it("attendant with no canteen assignment → FORBIDDEN", async () => {
    const [soda] = ctx.products;
    await expect(
      recordStockCountBatch(
        { lines: [{ productId: soda.id, countedQuantity: "1" }] },
        { userId: ctx.attendantId, role: "canteen_attendant", locationId: null },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
