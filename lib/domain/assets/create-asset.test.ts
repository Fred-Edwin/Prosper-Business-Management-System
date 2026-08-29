import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createAsset } from "./create-asset";
import {
  cleanupAssetsTestData,
  setupAssetsTestData,
  type AssetsTestCtx,
} from "./test-helpers";

const SCOPE = "create";

describe("createAsset", () => {
  let ctx: AssetsTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupAssetsTestData(SCOPE);
    P = ctx.prefix;
  });

  afterAll(async () => {
    await cleanupAssetsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("creates an asset with money as an exact decimal and the date as YYYY-MM-DD", async () => {
    const asset = await createAsset({
      name: `${P} Deep Fryer`,
      locationId: ctx.locationIds.restaurant,
      purchaseDate: "2025-01-15",
      purchaseCost: "45000",
      condition: "Good",
    });

    expect(asset.purchaseCost).toBe("45000.00");
    expect(asset.purchaseDate).toBe("2025-01-15");
    expect(asset.condition).toBe("Good");
    expect(asset.locationName).toBe(`${P} Restaurant`);
    expect(asset.deletedAt).toBeNull();

    const row = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(row.purchaseCost.toFixed(2)).toBe("45000.00");
  });

  it("rejects a blank name (VALIDATION_ERROR on name)", async () => {
    await expect(
      createAsset({
        name: "   ",
        locationId: ctx.locationIds.store,
        purchaseDate: "2025-01-15",
        purchaseCost: "1000",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "name" });
  });

  it("rejects a negative cost (VALIDATION_ERROR on purchaseCost)", async () => {
    await expect(
      createAsset({
        name: `${P} Bad Cost`,
        locationId: ctx.locationIds.store,
        purchaseDate: "2025-01-15",
        purchaseCost: "-5",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "purchaseCost" });
  });

  it("rejects a non-numeric cost (VALIDATION_ERROR on purchaseCost)", async () => {
    await expect(
      createAsset({
        name: `${P} NaN Cost`,
        locationId: ctx.locationIds.store,
        purchaseDate: "2025-01-15",
        purchaseCost: "not-a-number",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "purchaseCost" });
  });

  it("rejects a future purchase date (VALIDATION_ERROR on purchaseDate)", async () => {
    const nextYear = new Date();
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
    const future = nextYear.toISOString().slice(0, 10);

    await expect(
      createAsset({
        name: `${P} From The Future`,
        locationId: ctx.locationIds.store,
        purchaseDate: future,
        purchaseCost: "1000",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "purchaseDate" });
  });

  it("rejects an unknown condition (VALIDATION_ERROR on condition)", async () => {
    await expect(
      createAsset({
        name: `${P} Bad Condition`,
        locationId: ctx.locationIds.store,
        purchaseDate: "2025-01-15",
        purchaseCost: "1000",
        // @ts-expect-error — deliberately off-enum
        condition: "Mint",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "condition" });
  });

  it("rejects a non-existent location (VALIDATION_ERROR on locationId)", async () => {
    await expect(
      createAsset({
        name: `${P} Nowhere`,
        locationId: "does-not-exist",
        purchaseDate: "2025-01-15",
        purchaseCost: "1000",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "locationId" });
  });
});
