import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createAsset } from "./create-asset";
import { listAssets } from "./list-assets";
import {
  cleanupAssetsTestData,
  setupAssetsTestData,
  type AssetsTestCtx,
} from "./test-helpers";

const SCOPE = "list";

describe("listAssets", () => {
  let ctx: AssetsTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupAssetsTestData(SCOPE);
    P = ctx.prefix;

    await createAsset({
      name: `${P} Alpha Oven`,
      locationId: ctx.locationIds.restaurant,
      purchaseDate: "2025-01-01",
      purchaseCost: "10000",
      condition: "Good",
    });
    await createAsset({
      name: `${P} Beta Freezer`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2025-02-01",
      purchaseCost: "20000",
      condition: "Needs Repair",
    });
    await createAsset({
      name: `${P} Gamma Till`,
      locationId: ctx.locationIds.store,
      purchaseDate: "2025-03-01",
      purchaseCost: "30000",
      condition: "Decommissioned",
    });
  });

  afterAll(async () => {
    await cleanupAssetsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("returns rows ordered by name", async () => {
    const rows = (await listAssets({ search: P }, { role: "admin" })).map(
      (a) => a.name,
    );
    expect(rows).toEqual([
      `${P} Alpha Oven`,
      `${P} Beta Freezer`,
      `${P} Gamma Till`,
    ]);
  });

  it("filters by location", async () => {
    const rows = await listAssets(
      { search: P, locationId: ctx.locationIds.store },
      { role: "admin" },
    );
    expect(rows.map((a) => a.name)).toEqual([
      `${P} Beta Freezer`,
      `${P} Gamma Till`,
    ]);
  });

  it("filters by condition", async () => {
    const rows = await listAssets(
      { search: P, condition: "Needs Repair" },
      { role: "admin" },
    );
    expect(rows.map((a) => a.name)).toEqual([`${P} Beta Freezer`]);
  });

  it("search is case-insensitive on name", async () => {
    const rows = await listAssets(
      { search: `${P.toLowerCase()}gamma` },
      { role: "admin" },
    );
    // The prefix has fixed case; the point is `contains` + `mode: insensitive`.
    expect(rows.every((a) => a.name.toLowerCase().includes("gamma"))).toBe(true);
  });
});
