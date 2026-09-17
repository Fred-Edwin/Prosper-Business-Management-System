import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "./create-product";
import { updateProduct } from "./update-product";
import { listProducts } from "./list-products";
import {
  cleanupCatalogTestData,
  setupCatalogTestData,
  type CatalogTestCtx,
} from "./test-helpers";

const SCOPE = "low-stock";
const ADMIN = { role: "admin" as const };

async function setOnHand(
  productId: string,
  locationId: string,
  qty: string,
  recordedById: string,
): Promise<void> {
  await prisma.stockMovement.create({
    data: {
      productId,
      locationId,
      movementType: "opening",
      quantity: qty,
      recordedById,
      occurredAt: new Date(),
    },
  });
}

describe("catalog low-stock threshold", () => {
  let ctx: CatalogTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupCatalogTestData(SCOPE);
    P = ctx.prefix;
  });

  afterAll(async () => {
    await cleanupCatalogTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("create/update round-trips a threshold as a trimmed decimal string", async () => {
    const p = await createProduct({
      name: `${P} Flour`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      lowStockThreshold: "5.0000",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
      ],
    });
    expect(p.lowStockThreshold).toBe("5");

    const updated = await updateProduct(p.id, {
      name: `${P} Flour`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      lowStockThreshold: "12.5",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
      ],
    });
    expect(updated.lowStockThreshold).toBe("12.5");
  });

  it("rejects a negative threshold", async () => {
    await expect(
      createProduct({
        name: `${P} Negative`,
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "90",
        lowStockThreshold: "-1",
        locations: [],
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "lowStockThreshold",
    });
  });

  it("forces the threshold to null for a dish, even if one is submitted", async () => {
    const dish = await createProduct({
      name: `${P} Chapati`,
      kind: "dish",
      unitLabel: "pcs",
      lowStockThreshold: "10",
      locations: [
        { locationId: ctx.locationIds.restaurant, sellingPrice: "20", active: true },
      ],
    });
    expect(dish.lowStockThreshold).toBeNull();
  });

  it("lowStockOnly requires includeStock", async () => {
    await expect(
      listProducts({ lowStockOnly: true }, ADMIN),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lowStockOnly" });
  });

  it("lowStockOnly filters to stockQty <= threshold (or <= 0 when unset)", async () => {
    const low = await createProduct({
      name: `${P} LowThreshold`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      lowStockThreshold: "10",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
      ],
    });
    await setOnHand(low.id, ctx.locationIds.store, "8", ctx.userId);

    const ok = await createProduct({
      name: `${P} OkThreshold`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      lowStockThreshold: "10",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
      ],
    });
    await setOnHand(ok.id, ctx.locationIds.store, "50", ctx.userId);

    const noThreshold = await createProduct({
      name: `${P} NoThresholdNegative`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
      ],
    });
    await setOnHand(noThreshold.id, ctx.locationIds.store, "-2", ctx.userId);

    const rows = await listProducts(
      { search: P, includeStock: true, lowStockOnly: true },
      ADMIN,
    );
    const names = rows.map((r) => r.name);
    expect(names).toContain(`${P} LowThreshold`);
    expect(names).toContain(`${P} NoThresholdNegative`);
    expect(names).not.toContain(`${P} OkThreshold`);
  });
});
