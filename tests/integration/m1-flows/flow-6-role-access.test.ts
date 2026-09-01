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
let caId = "";
let storeId = "";
let canteenId = "";
let restaurantId = "";
let productId = "";
let dishId = "";
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
  caId = u.canteenAttendant;
  storeId = SEED_LOCATIONS.store;
  canteenId = SEED_LOCATIONS.canteen;
  restaurantId = SEED_LOCATIONS.restaurant;

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

  // A dish with stock at the Restaurant, then a pending transfer dispatch
  // Restaurant → Canteen — the sender-side `-q` row the Canteen Attendant
  // must see for the ADR-39 Accept banner.
  const dish = await prisma.product.create({
    data: {
      name: `${P} Chapati`,
      kind: "dish",
      unitLabel: "pcs",
      buyingPrice: "0",
    },
  });
  dishId = dish.id;
  await prisma.stockMovement.create({
    data: {
      productId: dishId,
      locationId: restaurantId,
      movementType: "production",
      quantity: "30",
      recordedById: adminId,
      occurredAt: new Date(),
    },
  });
  await prisma.stockMovement.create({
    data: {
      productId: dishId,
      locationId: restaurantId,
      movementType: "transfer",
      quantity: "-30",
      transferCounterpartLocationId: canteenId,
      recordedById: adminId,
      occurredAt: new Date(),
    },
  });
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
  it("assets list, unarchive product, restore asset → 403", async () => {
    actAs({ id: smId, role: "store_manager" });

    expect((await api.unarchiveProduct(productId)).status).toBe(403);
    expect((await api.restoreAsset(assetId)).status).toBe(403);
  });

  it("outstanding is no longer Admin-only — a store manager gets a location-scoped 200 (M2 §3.4)", async () => {
    actAs({ id: smId, role: "store_manager" });
    const out = await api.outstanding();
    expect(out.status).toBe(200);
    for (const r of out.body.data.awaitingReceipt) {
      expect(r.locationId).toBe(storeId);
    }
  });
});

describe("stock reads are scoped to the actor's location", () => {
  it("a store manager's movement list returns own-location rows, plus pending inbound transfers addressed here", async () => {
    actAs({ id: smId, role: "store_manager" });
    const list = await api.listMovements("");
    expect(list.status).toBe(200);
    // Every row is either at the SM's own location, or a pending inbound
    // transfer dispatch (-q `transfer`, not yet accepted) addressed to it
    // — the sender's row that powers the ADR-39 Accept banner.
    for (const m of list.body.data) {
      const ownLocation = m.locationId === storeId;
      const inboundTransfer =
        m.movementType === "transfer" &&
        m.transferCounterpartLocationId === storeId &&
        Number.parseFloat(m.quantity) < 0 &&
        m.correctsMovementId === null;
      expect(ownLocation || inboundTransfer).toBe(true);
    }
  });

  it("a receiver sees the pending inbound transfer dispatch addressed to their location (ADR-39 Accept banner)", async () => {
    actAs({ id: caId, role: "canteen_attendant" });
    const list = await api.listMovements("");
    expect(list.status).toBe(200);
    const inbound = list.body.data.find(
      (m: any) =>
        m.movementType === "transfer" &&
        m.transferCounterpartLocationId === canteenId &&
        Number.parseFloat(m.quantity) < 0 &&
        m.productId === dishId,
    );
    expect(inbound).toBeDefined();
    expect(inbound.locationId).toBe(restaurantId); // the SENDER's location
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
