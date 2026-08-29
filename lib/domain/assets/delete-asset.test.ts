import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createAsset } from "./create-asset";
import { hardDeleteAsset, softDeleteAsset, restoreAsset } from "./delete-asset";
import { listAssets } from "./list-assets";
import {
  cleanupAssetsTestData,
  setupAssetsTestData,
  type AssetsTestCtx,
} from "./test-helpers";

const SCOPE = "delete";

describe("delete-asset", () => {
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

  it("blocks a hard delete of an asset with linked history (CONFLICT); the asset survives", async () => {
    const asset = await createAsset({
      name: `${P} Has History`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2024-05-01",
      purchaseCost: "12000",
      condition: "Good",
    });

    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "correct",
        entityType: "asset",
        entityId: asset.id,
        occurredAt: new Date(),
      },
    });

    await expect(
      hardDeleteAsset(asset.id, asset.name),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const still = await prisma.asset.findUnique({ where: { id: asset.id } });
    expect(still).not.toBeNull();
  });

  it("hard-deletes an unreferenced asset when confirmName matches exactly", async () => {
    const asset = await createAsset({
      name: `${P} Clean Delete`,
      locationId: ctx.locationIds.canteen,
      purchaseDate: "2024-06-01",
      purchaseCost: "3000",
      condition: "Good",
    });

    await hardDeleteAsset(asset.id, asset.name);

    expect(
      await prisma.asset.findUnique({ where: { id: asset.id } }),
    ).toBeNull();
  });

  it("rejects a wrong confirmName (VALIDATION_ERROR on confirmName); nothing deleted", async () => {
    const asset = await createAsset({
      name: `${P} Keep Me`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2024-07-01",
      purchaseCost: "3000",
      condition: "Good",
    });

    await expect(
      hardDeleteAsset(asset.id, "not the name"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "confirmName" });

    expect(
      await prisma.asset.findUnique({ where: { id: asset.id } }),
    ).not.toBeNull();
  });

  it("softDeleteAsset stamps deletedAt and hides the row from listAssets; ?includeDeleted surfaces it", async () => {
    const asset = await createAsset({
      name: `${P} Soft Delete Me`,
      locationId: ctx.locationIds.restaurant,
      purchaseDate: "2024-08-01",
      purchaseCost: "5000",
      condition: "Needs Repair",
    });

    await softDeleteAsset(asset.id);

    const row = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(row.deletedAt).not.toBeNull();

    const listed = await listAssets(
      { search: `${P} Soft Delete Me` },
      { role: "admin" },
    );
    expect(listed.find((a) => a.id === asset.id)).toBeUndefined();

    const withDeleted = await listAssets(
      { search: `${P} Soft Delete Me`, includeDeleted: true },
      { role: "admin" },
    );
    expect(withDeleted.find((a) => a.id === asset.id)).toBeDefined();
  });

  it("softDeleteAsset is idempotent and NOT_FOUND for a missing asset", async () => {
    const asset = await createAsset({
      name: `${P} Twice`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2024-09-01",
      purchaseCost: "5000",
      condition: "Good",
    });
    await softDeleteAsset(asset.id);
    await expect(softDeleteAsset(asset.id)).resolves.toBeUndefined();

    await expect(softDeleteAsset("nope")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("restoreAsset clears deletedAt and the asset returns to the default listing (ADR-47 §4)", async () => {
    const asset = await createAsset({
      name: `${P} Restore Me`,
      locationId: ctx.locationIds.canteen,
      purchaseDate: "2024-10-01",
      purchaseCost: "7500",
      condition: "Good",
    });

    await softDeleteAsset(asset.id);
    await restoreAsset(asset.id);

    const row = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(row.deletedAt).toBeNull();

    const listed = await listAssets(
      { search: `${P} Restore Me` },
      { role: "admin" },
    );
    expect(listed.find((a) => a.id === asset.id)).toBeDefined();
  });

  it("restoreAsset is idempotent on an active asset and NOT_FOUND on a missing one", async () => {
    const asset = await createAsset({
      name: `${P} Always Active`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2024-11-01",
      purchaseCost: "1000",
      condition: "Good",
    });
    await expect(restoreAsset(asset.id)).resolves.toBeUndefined();
    await expect(restoreAsset("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
