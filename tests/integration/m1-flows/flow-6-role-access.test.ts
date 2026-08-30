// TEST_PLAN.md §2 flow 6 — role-scoped access end to end through the API,
// including the two Session-16 endpoints (ADR-47): unarchive product,
// restore asset. Non-admin → 403.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { api, actAs, seedUsers, SEED_LOCATIONS } from "./helpers";

const P = "__m1_flow6__";

let adminId = "";
let smId = "";
let cashierId = "";
let storeId = "";
let canteenId = "";
let productId = "";
let assetId = "";

async function cleanup() {
  await prisma.stockMovement.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.productLocation.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.product.deleteMany({ where: { name: { startsWith: P } } });
  await prisma.asset.deleteMany({ where: { name: { startsWith: P } } });
}

beforeAll(async () => {
  await cleanup();
  const u = await seedUsers();
  adminId = u.admin;
  smId = u.storeManager;
  cashierId = u.cashier;
  storeId = SEED_LOCATIONS.store;
  canteenId = SEED_LOCATIONS.canteen;

  const p = await prisma.product.create({
    data: {
      name: `${P} Widget`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: "10.00",
      deletedAt: new Date(),
    },
  });
  productId = p.id;
  const a = await prisma.asset.create({
    data: {
      name: `${P} Rig`,
      locationId: storeId,
      purchaseDate: new Date("2026-01-01"),
      purchaseCost: "5000.00",
      conditionStatus: "Good",
      deletedAt: new Date(),
    },
  });
  assetId = a.id;
});

afterAll(async () => {
  await cleanup();
});

describe("admin-only endpoints reject a store manager", () => {
  it("outstanding, assets list, unarchive product, restore asset → 403", async () => {
    actAs({ id: smId, role: "store_manager" });

    expect((await api.outstanding()).status).toBe(403);
    expect((await api.unarchiveProduct(productId)).status).toBe(403);
    expect((await api.restoreAsset(assetId)).status).toBe(403);
  });
});

describe("stock reads are scoped to the actor's location", () => {
  it("a store manager's movement list only ever returns their own location", async () => {
    actAs({ id: smId, role: "store_manager" });
    const list = await api.listMovements("");
    expect(list.status).toBe(200);
    for (const m of list.body.data) expect(m.locationId).toBe(storeId);
  });

  it("balances at a foreign location short-circuit to []", async () => {
    actAs({ id: smId, role: "store_manager" });
    const res = await api.balances(
      `?productIds=seed-product-carrots&locationId=${canteenId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("a write to a foreign location is FORBIDDEN", async () => {
    actAs({ id: smId, role: "store_manager" });
    const res = await api.createMovement({
      movementType: "issue",
      productId: "seed-product-carrots",
      locationId: canteenId,
      quantity: "1",
    });
    expect(res.status).toBe(403);
  });
});

describe("catalogue read scope", () => {
  it("a cashier can read products but buyingPrice is stripped to null", async () => {
    // M2 Session 6 (owner-approved): the Cashier's C2 New-Order product
    // grid reads the catalogue. buyingPrice is still stripped for every
    // non-admin caller — no cost/margin leak (plan §3.6).
    actAs({ id: cashierId, role: "cashier" });
    const res = await api.listProducts();
    expect(res.status).toBe(200);
    for (const p of res.body.data) expect(p.buyingPrice).toBeNull();
  });

  it("a store manager can read products but buyingPrice is stripped to null", async () => {
    actAs({ id: smId, role: "store_manager" });
    const res = await api.listProducts();
    expect(res.status).toBe(200);
    for (const p of res.body.data) expect(p.buyingPrice).toBeNull();
  });
});

describe("the two Session-16 restore endpoints (admin)", () => {
  it("unarchive product + restore asset succeed and are idempotent; bad ?mode → 400", async () => {
    actAs({ id: adminId, role: "admin" });

    expect((await api.unarchiveProduct(productId)).status).toBe(200);
    expect((await api.unarchiveProduct(productId)).status).toBe(200); // idempotent
    expect((await api.restoreAsset(assetId)).status).toBe(200);
    expect((await api.restoreAsset(assetId)).status).toBe(200);

    expect((await api.unarchiveProduct(productId, "bogus")).status).toBe(400);
  });
});
