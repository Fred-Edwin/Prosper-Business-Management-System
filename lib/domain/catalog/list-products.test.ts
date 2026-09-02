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

const SCOPE = "list";
const ADMIN = { role: "admin" as const };

describe("listProducts — locationId filter", () => {
  let ctx: CatalogTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupCatalogTestData(SCOPE);
    P = ctx.prefix;

    // Store + Restaurant, both active.
    await createProduct({
      name: `${P} Rice`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "120",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
        { locationId: ctx.locationIds.restaurant, sellingPrice: null, active: true },
      ],
    });
    // Restaurant only.
    await createProduct({
      name: `${P} Chapati`,
      kind: "dish",
      unitLabel: "pcs",
      locations: [
        { locationId: ctx.locationIds.restaurant, sellingPrice: "20", active: true },
      ],
    });
    // Canteen only.
    await createProduct({
      name: `${P} Soda`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: "30",
      locations: [
        { locationId: ctx.locationIds.canteen, sellingPrice: "50", active: true },
      ],
    });
    // Store, but the assignment is INACTIVE (location dropped for the product).
    const dropped = await createProduct({
      name: `${P} Old Flour`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: true },
      ],
    });
    await updateProduct(dropped.id, {
      name: `${P} Old Flour`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "90",
      locations: [
        { locationId: ctx.locationIds.store, sellingPrice: null, active: false },
      ],
    });
  });

  afterAll(async () => {
    await cleanupCatalogTestData(SCOPE);
    await prisma.$disconnect();
  });

  const namesAt = async (locationId?: string) => {
    const rows = await listProducts({ locationId }, ADMIN);
    return rows
      .filter((r) => r.name.startsWith(P))
      .map((r) => r.name.replace(P, "").trim())
      .sort();
  };

  it("returns every product when no locationId is given", async () => {
    expect(await namesAt()).toEqual(["Chapati", "Old Flour", "Rice", "Soda"]);
  });

  it("restricts to products with an active ProductLocation at the location", async () => {
    expect(await namesAt(ctx.locationIds.restaurant)).toEqual(["Chapati", "Rice"]);
    expect(await namesAt(ctx.locationIds.canteen)).toEqual(["Soda"]);
  });

  it("excludes a product whose ProductLocation at that location is inactive", async () => {
    // Store has Rice (active) but not Old Flour (assignment inactive).
    expect(await namesAt(ctx.locationIds.store)).toEqual(["Rice"]);
  });

  it("combines locationId with kind", async () => {
    const rows = await listProducts(
      { locationId: ctx.locationIds.restaurant, kind: "dish" },
      ADMIN,
    );
    const names = rows
      .filter((r) => r.name.startsWith(P))
      .map((r) => r.name.replace(P, "").trim());
    expect(names).toEqual(["Chapati"]);
  });

  it("returns nothing for a location no test product is assigned to", async () => {
    const other = await prisma.location.create({
      data: { name: `${P} Warehouse`, type: "store" },
    });
    expect(await namesAt(other.id)).toEqual([]);
  });
});
