import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "./create-product";
import { DomainError } from "./errors";
import {
  cleanupCatalogTestData,
  setupCatalogTestData,
  type CatalogTestCtx,
} from "./test-helpers";

const SCOPE = "create";

describe("createProduct", () => {
  let ctx: CatalogTestCtx;
  let TEST_PREFIX: string;

  beforeAll(async () => {
    ctx = await setupCatalogTestData(SCOPE);
    TEST_PREFIX = ctx.prefix;
  });

  afterAll(async () => {
    await cleanupCatalogTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("forces buyingPrice to 0 for a dish, whatever was passed (ADR-33)", async () => {
    const dish = await createProduct({
      name: `${TEST_PREFIX} Grilled Chicken`,
      kind: "dish",
      unitLabel: "pcs",
      buyingPrice: "500",
      locations: [
        { locationId: ctx.locationIds.restaurant, sellingPrice: "480.00", active: true },
      ],
    });

    expect(dish.buyingPrice).toBe("0.00");
    const row = await prisma.product.findUniqueOrThrow({ where: { id: dish.id } });
    expect(row.buyingPrice?.toFixed(2)).toBe("0.00");
  });

  it("keeps the buying price for an ingredient", async () => {
    const ing = await createProduct({
      name: `${TEST_PREFIX} Chicken Breast`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "580",
      locations: [],
    });

    expect(ing.buyingPrice).toBe("580.00");
  });

  it("writes one ProductLocation row per submitted location with the right selling prices", async () => {
    const product = await createProduct({
      name: `${TEST_PREFIX} Soda 300ml`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: "35",
      locations: [
        { locationId: ctx.locationIds.restaurant, sellingPrice: "100.00", active: true },
        { locationId: ctx.locationIds.canteen, sellingPrice: "90.00", active: true },
        { locationId: ctx.locationIds.store, sellingPrice: "50.00", active: true },
      ],
    });

    const rows = await prisma.productLocation.findMany({
      where: { productId: product.id },
      orderBy: { sellingPrice: "asc" },
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.sellingPrice?.toFixed(2))).toEqual([
      "50.00",
      "90.00",
      "100.00",
    ]);
  });

  it("rejects a goods product with no buying price (VALIDATION_ERROR)", async () => {
    await expect(
      createProduct({
        name: `${TEST_PREFIX} Bar Soap`,
        kind: "goods",
        unitLabel: "pcs",
        locations: [],
      }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "buyingPrice",
    });
  });
});
