import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "./create-product";
import { updateProduct } from "./update-product";
import {
  cleanupCatalogTestData,
  setupCatalogTestData,
  type CatalogTestCtx,
} from "./test-helpers";

const SCOPE = "update";

describe("updateProduct", () => {
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

  it("zeroes the buying price when an ingredient is changed to a dish", async () => {
    const ing = await createProduct({
      name: `${TEST_PREFIX} Convertible`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "580",
      locations: [],
    });
    expect(ing.buyingPrice).toBe("580.00");

    const updated = await updateProduct(ing.id, {
      name: ing.name,
      kind: "dish",
      unitLabel: "pcs",
      buyingPrice: "999",
      locations: [],
    });

    expect(updated.kind).toBe("dish");
    expect(updated.buyingPrice).toBe("0.00");
  });

  it("adds a new location, updates an existing price, and deactivates a dropped one", async () => {
    const product = await createProduct({
      name: `${TEST_PREFIX} Reconcile Me`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: "35",
      locations: [
        { locationId: ctx.locationIds.restaurant, sellingPrice: "100.00", active: true },
        { locationId: ctx.locationIds.canteen, sellingPrice: "90.00", active: true },
      ],
    });

    // Drop restaurant, keep canteen at a new price, add store.
    await updateProduct(product.id, {
      name: product.name,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: "35",
      locations: [
        { locationId: ctx.locationIds.canteen, sellingPrice: "95.00", active: true },
        { locationId: ctx.locationIds.store, sellingPrice: "50.00", active: true },
      ],
    });

    const rows = await prisma.productLocation.findMany({
      where: { productId: product.id },
    });
    const byLocation = Object.fromEntries(
      rows.map((r) => [r.locationId, r]),
    );

    // restaurant row still exists but is deactivated (audit-preserving)
    expect(byLocation[ctx.locationIds.restaurant].active).toBe(false);
    // canteen price updated, still active
    expect(byLocation[ctx.locationIds.canteen].active).toBe(true);
    expect(byLocation[ctx.locationIds.canteen].sellingPrice?.toFixed(2)).toBe("95.00");
    // store row added
    expect(byLocation[ctx.locationIds.store].active).toBe(true);
    expect(byLocation[ctx.locationIds.store].sellingPrice?.toFixed(2)).toBe("50.00");
  });

  it("throws NOT_FOUND for a missing product", async () => {
    await expect(
      updateProduct("00000000-0000-0000-0000-000000000000", {
        name: `${TEST_PREFIX} Ghost`,
        kind: "goods",
        unitLabel: "pcs",
        buyingPrice: "1",
        locations: [],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
