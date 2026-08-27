import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createProduct } from "./create-product";
import { archiveProduct, hardDeleteProduct } from "./delete-product";
import { listProducts } from "./list-products";
import {
  cleanupCatalogTestData,
  setupCatalogTestData,
  type CatalogTestCtx,
} from "./test-helpers";

const SCOPE = "delete";

describe("delete-product", () => {
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

  it("blocks a hard delete of a product with a linked StockMovement (CONFLICT); product survives", async () => {
    const product = await createProduct({
      name: `${TEST_PREFIX} Has History`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "100",
      locations: [],
    });

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        locationId: ctx.locationIds.store,
        movementType: "purchase_receipt",
        quantity: "10",
        recordedById: ctx.userId,
        occurredAt: new Date(),
      },
    });

    await expect(
      hardDeleteProduct(product.id, product.name),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const still = await prisma.product.findUnique({ where: { id: product.id } });
    expect(still).not.toBeNull();
  });

  it("hard-deletes an unreferenced product (and its ProductLocation rows) when confirmName matches", async () => {
    const product = await createProduct({
      name: `${TEST_PREFIX} Clean Delete`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: "20",
      locations: [
        { locationId: ctx.locationIds.canteen, sellingPrice: "55.00", active: true },
      ],
    });

    await hardDeleteProduct(product.id, product.name);

    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
    expect(
      await prisma.productLocation.count({ where: { productId: product.id } }),
    ).toBe(0);
  });

  it("rejects a wrong confirmName (VALIDATION_ERROR); nothing deleted", async () => {
    const product = await createProduct({
      name: `${TEST_PREFIX} Keep Me`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: "20",
      locations: [],
    });

    await expect(
      hardDeleteProduct(product.id, "not the name"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "confirmName" });

    expect(await prisma.product.findUnique({ where: { id: product.id } })).not.toBeNull();
  });

  it("archiveProduct sets deletedAt and drops the product from a non-archived listing", async () => {
    const product = await createProduct({
      name: `${TEST_PREFIX} Archive Me`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "100",
      locations: [
        { locationId: ctx.locationIds.restaurant, sellingPrice: "200.00", active: true },
      ],
    });

    await archiveProduct(product.id);

    const row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(row.deletedAt).not.toBeNull();

    const plRows = await prisma.productLocation.findMany({
      where: { productId: product.id },
    });
    expect(plRows.every((r) => !r.active)).toBe(true);

    const listed = await listProducts(
      { search: `${TEST_PREFIX} Archive Me` },
      { role: "admin" },
    );
    expect(listed.find((p) => p.id === product.id)).toBeUndefined();

    const withArchived = await listProducts(
      { search: `${TEST_PREFIX} Archive Me`, includeArchived: true },
      { role: "admin" },
    );
    expect(withArchived.find((p) => p.id === product.id)).toBeDefined();
  });
});
