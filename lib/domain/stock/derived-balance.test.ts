import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  getDerivedStockBalance,
  getDerivedStockBalances,
} from "./derived-balance";
import { setOpeningStock } from "./opening-stock";
import { recordPurchaseReceipt } from "./purchases";
import { recordKitchenIssue } from "./issue-production";
import { recordNonSaleConsumption } from "./consumption";
import { correctMovement } from "./correct-movement";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "derived";

describe("getDerivedStockBalance", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("sums opening + receipts − issues − consumption to the right signed figure", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.store;

    await setOpeningStock({
      productId,
      locationId,
      businessDate: "2026-08-01",
      quantity: "100",
      recordedById: recorderId,
    });
    await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "40",
      recordedById: recorderId,
    });
    await recordKitchenIssue({
      productId,
      locationId,
      quantity: "15",
      recordedById: recorderId,
    });
    await recordNonSaleConsumption({
      productId,
      locationId,
      quantity: "5",
      reason: "spoiled",
      recordedById: recorderId,
    });

    // 100 + 40 − 15 − 5 = 120
    const bal = await getDerivedStockBalance({ productId, locationId });
    expect(bal.quantity).toBe("120.0000");
  });

  it("includes a correction row exactly once (no double-count, no omission)", async () => {
    const { locationIds, recorderId, prefix } = ctx;
    const locationId = locationIds.canteen;
    const product = await prisma.product.create({
      data: {
        name: `${prefix} Beans`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 90,
      },
    });

    const receipt = await recordPurchaseReceipt({
      productId: product.id,
      locationId,
      quantity: "30",
      recordedById: recorderId,
    });
    expect(
      (await getDerivedStockBalance({ productId: product.id, locationId }))
        .quantity,
    ).toBe("30.0000");

    // Correct the receipt: it should have been 25, not 30 (delta −5).
    await correctMovement(
      { movementId: receipt.id, correctedQuantity: "25", recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId },
    );

    const bal = await getDerivedStockBalance({ productId: product.id, locationId });
    expect(bal.quantity).toBe("25.0000");

    // Exactly two rows contribute: the original +30 and the −5 delta.
    const rows = await prisma.stockMovement.findMany({
      where: { productId: product.id, locationId },
    });
    expect(rows).toHaveLength(2);
  });

  it("excludes rows after `asOf`", async () => {
    const { locationIds, recorderId, prefix } = ctx;
    const locationId = locationIds.restaurant;
    const product = await prisma.product.create({
      data: {
        name: `${prefix} Oil`,
        kind: "ingredient",
        unitLabel: "L",
        buyingPrice: 300,
      },
    });

    await setOpeningStock({
      productId: product.id,
      locationId,
      businessDate: "2026-08-01",
      quantity: "10",
      recordedById: recorderId,
    });
    // A later receipt, well after the cutoff.
    await recordPurchaseReceipt({
      productId: product.id,
      locationId,
      quantity: "7",
      recordedById: recorderId,
    });

    const asOf = new Date("2026-08-02T00:00:00Z");
    const bal = await getDerivedStockBalance({
      productId: product.id,
      locationId,
      asOf,
    });
    expect(bal.quantity).toBe("10.0000"); // opening only; receipt is "now"
  });

  it("batched variant returns 0.0000 for products with no rows", async () => {
    const { productId, locationIds, prefix } = ctx;
    const locationId = locationIds.store;
    const empty = await prisma.product.create({
      data: {
        name: `${prefix} Salt`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: 20,
      },
    });

    const balances = await getDerivedStockBalances(
      [productId, empty.id],
      locationId,
    );
    const byId = new Map(balances.map((b) => [b.productId, b.quantity]));
    expect(byId.get(productId)).toBe("120.0000");
    expect(byId.get(empty.id)).toBe("0.0000");
  });
});
