import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "./create-order";
import { recordStockCount } from "./record-stock-count";
import { DomainError } from "./errors";
import {
  cleanupSalesTestData,
  setupCanteenTestData,
  setupSalesTestData,
  type CanteenTestCtx,
  type SalesTestCtx,
} from "./test-helpers";

/**
 * ADR-67 §2c — confirm an `ingredient` cannot reach a `sale` /
 * `stock_count`-derived-sale row, WITHOUT adding a new guard in the sales
 * domain.
 *
 * The model already excludes it: both `createOrder` (via
 * `order-effects.validateOrder`) and `recordStockCount` (via
 * `assertCanteenSellable`) require an **active `ProductLocation` with a
 * non-null `sellingPrice`**, and `sellingPrice` is Dish/Goods only
 * (SCHEMA §2). An ingredient has no selling price anywhere, so it fails
 * the "is not sold here" check before any stock movement is written.
 *
 * These tests lock that in — if a future change lets an ingredient carry a
 * selling price, they go red and the `assertKindAllowedAtLocation` helper
 * should be wired into the sales path.
 */

const SCOPE = "ingredient-not-sellable";

describe("an ingredient can never be sold (ADR-67 §2c)", () => {
  let ctx: SalesTestCtx;

  beforeEach(async () => {
    ctx = await setupSalesTestData(SCOPE);
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("createOrder rejects a line for an ingredient product (no Restaurant selling price)", async () => {
    // An ingredient — Store-only, never priced, so NO ProductLocation with
    // a sellingPrice at the Restaurant.
    const ingredient = await prisma.product.create({
      data: {
        name: `${ctx.prefix} Raw Rice`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "150.00",
      },
    });

    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: ingredient.id, quantity: "1" }],
        },
        {
          userId: ctx.cashierId,
          role: "cashier",
          restaurantId: ctx.restaurantId,
        },
      ),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
    });

    // Nothing written.
    const sales = await prisma.stockMovement.count({
      where: { productId: ingredient.id, movementType: "sale" },
    });
    expect(sales).toBe(0);
  });
});

describe("an ingredient can never be counted as a Canteen sale (ADR-67 §2c)", () => {
  let ctx: CanteenTestCtx;

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("recordStockCount rejects an ingredient (not canteen-sellable — no selling price)", async () => {
    const ingredient = await prisma.product.create({
      data: {
        name: `${ctx.prefix} Raw Flour`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "90.00",
      },
    });

    await expect(
      recordStockCount(
        { productId: ingredient.id, countedQuantity: "0" },
        {
          userId: ctx.attendantId,
          role: "canteen_attendant",
          locationId: ctx.canteenId,
        },
      ),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
    });

    const derivedSales = await prisma.stockMovement.count({
      where: { productId: ingredient.id, movementType: "sale" },
    });
    expect(derivedSales).toBe(0);
  });
});
