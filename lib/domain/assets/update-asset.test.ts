import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createAsset } from "./create-asset";
import { transitionCondition, updateAsset } from "./update-asset";
import { softDeleteAsset } from "./delete-asset";
import { listAssets } from "./list-assets";
import { ASSET_CONDITIONS } from "./types";
import {
  cleanupAssetsTestData,
  setupAssetsTestData,
  type AssetsTestCtx,
} from "./test-helpers";

const SCOPE = "update";

describe("updateAsset / transitionCondition", () => {
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

  it("edits an asset in place (true update, not a correction row — ADR-22)", async () => {
    const asset = await createAsset({
      name: `${P} Chiller`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2024-11-10",
      purchaseCost: "92000",
      condition: "Good",
    });

    const updated = await updateAsset(asset.id, {
      name: `${P} Chiller (relocated)`,
      locationId: ctx.locationIds.canteen,
      purchaseDate: "2024-11-10",
      purchaseCost: "92000",
      condition: "Needs Repair",
    });

    expect(updated.id).toBe(asset.id);
    expect(updated.name).toBe(`${P} Chiller (relocated)`);
    expect(updated.locationName).toBe(`${P} Canteen`);
    expect(updated.condition).toBe("Needs Repair");

    // Same row — no second row was written.
    const count = await prisma.asset.count({
      where: { name: { startsWith: `${P} Chiller` } },
    });
    expect(count).toBe(1);
  });

  it("updateAsset throws NOT_FOUND for a missing / soft-deleted asset", async () => {
    await expect(
      updateAsset("nope", {
        name: `${P} Ghost`,
        locationId: ctx.locationIds.store,
        purchaseDate: "2024-01-01",
        purchaseCost: "1",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const asset = await createAsset({
      name: `${P} Soon Gone`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2024-01-01",
      purchaseCost: "10",
      condition: "Good",
    });
    await softDeleteAsset(asset.id);

    await expect(
      updateAsset(asset.id, {
        name: `${P} Soon Gone`,
        locationId: ctx.locationIds.store,
        purchaseDate: "2024-01-01",
        purchaseCost: "10",
        condition: "Good",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("transitionCondition moves through every allowed state; the read path shows the current one", async () => {
    const asset = await createAsset({
      name: `${P} POS Tablet`,
      locationId: ctx.locationIds.restaurant,
      purchaseDate: "2025-08-12",
      purchaseCost: "28000",
      condition: "Good",
    });

    for (const next of ASSET_CONDITIONS) {
      const moved = await transitionCondition(asset.id, { condition: next });
      expect(moved.condition).toBe(next);

      const [readBack] = await listAssets(
        { search: `${P} POS Tablet` },
        { role: "admin" },
      );
      expect(readBack.condition).toBe(next);
    }
  });

  it("transitionCondition rejects an unknown condition", async () => {
    const asset = await createAsset({
      name: `${P} Blender`,
      locationId: ctx.locationIds.restaurant,
      purchaseDate: "2025-02-02",
      purchaseCost: "8000",
      condition: "Good",
    });

    await expect(
      // @ts-expect-error — deliberately off-enum
      transitionCondition(asset.id, { condition: "Pristine" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "condition" });
  });
});
