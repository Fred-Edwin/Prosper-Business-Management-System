import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role access + wiring + cross-location scoping for the batch movement
// routes. The domain behaviour (atomic block, empty/duplicate rejection,
// one AuditLog per line) is covered in
// `lib/domain/stock/movement-batch.test.ts`; here we assert who may call
// each route and that a location-bound caller can't target a foreign
// location.

const mockSession = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

function sessionFor(role: string, id: string, active = true) {
  return {
    user: { id, name: role, role, active },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

const PREFIX = "__batch_route_test__";

let storeId: string;
let canteenId: string;
let restaurantId: string;
let smId: string; // store manager at storeId
let attendantId: string; // canteen attendant at canteenId
let cashierId: string; // cashier at restaurantId (Session 16 — non-sale flow)
let adminId: string;
let smNoLocId: string;
let ingredientAtStore: string;
let dishProduct: string;
let goodsProduct: string;

type BatchPath = "receipts" | "issues" | "production" | "transfers" | "non-sale";

async function batchHandler(path: BatchPath) {
  switch (path) {
    case "receipts":
      return (await import("./receipts/batch/route")).POST;
    case "issues":
      return (await import("./issues/batch/route")).POST;
    case "production":
      return (await import("./production/batch/route")).POST;
    case "transfers":
      return (await import("./transfers/batch/route")).POST;
    case "non-sale":
      return (await import("./non-sale/batch/route")).POST;
  }
}

async function callBatch(path: BatchPath, payload: unknown) {
  const POST = await batchHandler(path);
  const res = await POST(
    new NextRequest(`http://test/api/stock-movements/${path}/batch`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

async function getOutstanding() {
  const { GET } = await import("./outstanding/route");
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

beforeAll(async () => {
  const store = await prisma.location.create({
    data: { name: `${PREFIX} Store`, type: "store", active: true },
  });
  const canteen = await prisma.location.create({
    data: { name: `${PREFIX} Canteen`, type: "canteen", active: true },
  });
  const restaurant = await prisma.location.create({
    data: { name: `${PREFIX} Restaurant`, type: "restaurant", active: true },
  });
  storeId = store.id;
  canteenId = canteen.id;
  restaurantId = restaurant.id;

  const smStaff = await prisma.staff.create({
    data: {
      name: `${PREFIX} SM`,
      role: "store_manager",
      locationId: storeId,
      dailyRate: new Prisma.Decimal("0"),
      active: true,
    },
  });
  const attStaff = await prisma.staff.create({
    data: {
      name: `${PREFIX} Att`,
      role: "canteen_attendant",
      locationId: canteenId,
      dailyRate: new Prisma.Decimal("0"),
      active: true,
    },
  });
  smId = (
    await prisma.user.create({
      data: {
        name: `${PREFIX} SM`,
        pinHash: "x",
        role: "store_manager",
        active: true,
        staffId: smStaff.id,
      },
    })
  ).id;
  attendantId = (
    await prisma.user.create({
      data: {
        name: `${PREFIX} Att`,
        pinHash: "x",
        role: "canteen_attendant",
        active: true,
        staffId: attStaff.id,
      },
    })
  ).id;
  const cashierStaff = await prisma.staff.create({
    data: {
      name: `${PREFIX} Cashier`,
      role: "cashier",
      locationId: restaurantId,
      dailyRate: new Prisma.Decimal("0"),
      active: true,
    },
  });
  cashierId = (
    await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
        staffId: cashierStaff.id,
      },
    })
  ).id;
  smNoLocId = (
    await prisma.user.create({
      data: {
        name: `${PREFIX} SM NoLoc`,
        pinHash: "x",
        role: "store_manager",
        active: true,
      },
    })
  ).id;
  adminId = (
    await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    })
  ).id;

  const ing = await prisma.product.create({
    data: {
      name: `${PREFIX} Rice`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: new Prisma.Decimal("100"),
    },
  });
  ingredientAtStore = ing.id;
  const dish = await prisma.product.create({
    data: {
      name: `${PREFIX} Pilau`,
      kind: "dish",
      unitLabel: "plate",
      buyingPrice: new Prisma.Decimal("0"),
    },
  });
  dishProduct = dish.id;
  const goods = await prisma.product.create({
    data: {
      name: `${PREFIX} Soda`,
      kind: "goods",
      unitLabel: "pcs",
      buyingPrice: new Prisma.Decimal("45"),
    },
  });
  goodsProduct = goods.id;

  await prisma.stockMovement.create({
    data: {
      productId: ingredientAtStore,
      locationId: storeId,
      movementType: "opening",
      quantity: new Prisma.Decimal("100"),
      recordedById: adminId,
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    },
  });
  // A dish batch already at the Restaurant, so the SM → Canteen transfer
  // (dispatched FROM the Restaurant) has stock to move.
  await prisma.stockMovement.create({
    data: {
      productId: dishProduct,
      locationId: restaurantId,
      movementType: "production",
      quantity: new Prisma.Decimal("30"),
      recordedById: adminId,
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    },
  });
});

afterAll(async () => {
  const productIds = [ingredientAtStore, dishProduct, goodsProduct];
  await prisma.moneyMovement.deleteMany({
    where: { recordedBy: { name: { startsWith: PREFIX } } },
  });
  await prisma.stockMovement.deleteMany({
    where: { productId: { in: productIds } },
  });
  await prisma.productLocation.deleteMany({
    where: { productId: { in: productIds } },
  });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.auditLog.deleteMany({
    where: { user: { name: { startsWith: PREFIX } } },
  });
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe("batch movement routes — auth + wiring", () => {
  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect(
      (
        await callBatch("issues", {
          locationId: storeId,
          lines: [{ productId: ingredientAtStore, quantity: "1" }],
        })
      ).status,
    ).toBe(401);
  });

  it("cashier → 403 (role gate)", async () => {
    mockSession.current = sessionFor("cashier", adminId);
    expect(
      (
        await callBatch("issues", {
          locationId: storeId,
          lines: [{ productId: ingredientAtStore, quantity: "1" }],
        })
      ).status,
    ).toBe(403);
  });

  it("store_manager issue batch at own location → 201, stock moves", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const res = await callBatch("issues", {
      locationId: storeId,
      lines: [{ productId: ingredientAtStore, quantity: "10" }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].quantity).toBe("-10.0000");
  });

  it("store_manager cannot post a batch for another location → 403, nothing written", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const before = await prisma.stockMovement.count({
      where: { locationId: canteenId },
    });
    const res = await callBatch("issues", {
      locationId: canteenId,
      lines: [{ productId: ingredientAtStore, quantity: "1" }],
    });
    expect(res.status).toBe(403);
    expect(
      await prisma.stockMovement.count({ where: { locationId: canteenId } }),
    ).toBe(before);
  });

  it("issue batch over-stock line → 400 VALIDATION_ERROR field 'lines', nothing written", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const before = await prisma.stockMovement.count({
      where: { productId: ingredientAtStore },
    });
    const res = await callBatch("issues", {
      locationId: storeId,
      lines: [{ productId: ingredientAtStore, quantity: "999999" }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.field).toBe("lines");
    expect(
      await prisma.stockMovement.count({ where: { productId: ingredientAtStore } }),
    ).toBe(before);
  });

  it("empty lines → 400 field 'lines'", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const res = await callBatch("issues", { locationId: storeId, lines: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe("lines");
  });

  it("production batch: admin, restaurant + dish line → 201", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await callBatch("production", {
      locationId: restaurantId,
      lines: [{ productId: dishProduct, quantity: "5" }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data[0].movementType).toBe("production");
  });

  it("receipt batch: canteen attendant at own location → 201 (additive, no money)", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    // A goods delivery INTO the Canteen — legal under ADR-67 (an ingredient
    // here would be rejected by R1).
    const res = await callBatch("receipts", {
      locationId: canteenId,
      lines: [{ productId: goodsProduct, quantity: "20" }],
    });
    expect(res.status).toBe(201);
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceId: { in: res.body.data.map((r: { id: string }) => r.id) } },
    });
    expect(mm).toHaveLength(0);
  });

  it("transfer batch: SM dispatching FROM a foreign location → 403", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    // The own-location guard rejects this before the domain sees it — a
    // Canteen→Restaurant transfer the SM isn't scoped to.
    const res = await callBatch("transfers", {
      fromLocationId: canteenId,
      toLocationId: restaurantId,
      lines: [{ productId: goodsProduct, quantity: "1" }],
    });
    expect(res.status).toBe(403);
  });

  // FIX-1 — the SM → Canteen sellable-output transfer is dispatched FROM
  // the Restaurant (production's landing location), not the SM's home
  // Store. The own-location guard must carve this out, like the
  // production batch route already does.
  it("transfer batch: SM dispatching FROM the Restaurant → 201", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const res = await callBatch("transfers", {
      fromLocationId: restaurantId,
      toLocationId: canteenId,
      lines: [{ productId: dishProduct, quantity: "4" }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data[0].movementType).toBe("transfer");
  });

  // ADR-67 — goods deliveries land at the Restaurant, so the SM must be
  // able to post a receipt batch there (the same carve-out production /
  // transfer batches make).
  it("receipt batch: SM receiving goods INTO the Restaurant → 201", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const res = await callBatch("receipts", {
      locationId: restaurantId,
      lines: [{ productId: goodsProduct, quantity: "12" }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data[0].movementType).toBe("purchase_receipt");
    expect(res.body.data[0].locationId).toBe(restaurantId);
  });

  // ADR-69 — the destination guard is a MAP, not a blanket widening: the
  // SM's receiving scope is Store + Restaurant, and the Canteen is the
  // attendant's. (Before ADR-69 this route special-cased "SM at a
  // restaurant" inline; the shared map now also has to keep saying no.)
  it("receipt batch: SM receiving INTO the Canteen → 403, nothing written", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const before = await prisma.stockMovement.count({
      where: { productId: goodsProduct, locationId: canteenId },
    });
    const res = await callBatch("receipts", {
      locationId: canteenId,
      lines: [{ productId: goodsProduct, quantity: "3" }],
    });
    expect(res.status).toBe(403);
    expect(
      await prisma.stockMovement.count({
        where: { productId: goodsProduct, locationId: canteenId },
      }),
    ).toBe(before);
  });

  it("receipt batch: canteen attendant receiving INTO the Store → 403", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await callBatch("receipts", {
      locationId: storeId,
      lines: [{ productId: ingredientAtStore, quantity: "3" }],
    });
    expect(res.status).toBe(403);
  });

  it("receipt batch: SM receiving a GOODS line INTO the Store → 400 (R1), nothing written", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const before = await prisma.stockMovement.count({
      where: { productId: goodsProduct },
    });
    const res = await callBatch("receipts", {
      locationId: storeId,
      lines: [{ productId: goodsProduct, quantity: "5" }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(
      await prisma.stockMovement.count({ where: { productId: goodsProduct } }),
    ).toBe(before);
  });

  it("non-sale batch: SM with no location link → 403", async () => {
    mockSession.current = sessionFor("store_manager", smNoLocId);
    const res = await callBatch("non-sale", {
      locationId: storeId,
      reason: "spoiled",
      lines: [{ productId: ingredientAtStore, quantity: "1" }],
    });
    expect(res.status).toBe(403);
  });

  // Session 16 — the non-sale batch route is the one batch route widened
  // to `cashier` (the Restaurant non-sale flow, /cashier/flows/non-sale).
  it("non-sale batch: cashier at own location (Restaurant) → 201, dish written", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const res = await callBatch("non-sale", {
      locationId: restaurantId,
      reason: "spoiled",
      lines: [{ productId: dishProduct, quantity: "2" }],
    });
    expect(res.status).toBe(201);
    expect(
      await prisma.stockMovement.count({
        where: {
          productId: dishProduct,
          locationId: restaurantId,
          movementType: "non_sale_consumption",
        },
      }),
    ).toBe(1);
  });

  it("non-sale batch: cashier aiming at a FOREIGN location (Store) → 403, nothing written", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const before = await prisma.stockMovement.count({
      where: { productId: ingredientAtStore },
    });
    const res = await callBatch("non-sale", {
      locationId: storeId,
      reason: "spoiled",
      lines: [{ productId: ingredientAtStore, quantity: "1" }],
    });
    expect(res.status).toBe(403);
    expect(
      await prisma.stockMovement.count({ where: { productId: ingredientAtStore } }),
    ).toBe(before);
  });
});

/**
 * ADR-69 — `/outstanding` is scoped by DESTINATION, not by the caller's
 * home location. The old rule ("hard-scoped to the SM's own location",
 * 3-DOMAIN §3.4) made a Restaurant- or Canteen-destined purchase a dead
 * end: ADR-67 lands goods at the Restaurant, the SM is assigned to the
 * Store, so the SM could WRITE that receipt but never see one was
 * pending; and the attendant was 403'd outright.
 */
describe("GET /api/stock-movements/outstanding — destination-scoped (ADR-69)", () => {
  let paymentAtStore: string;
  let paymentAtRestaurant: string;
  let paymentAtCanteen: string;

  beforeAll(async () => {
    // Two purchase_payment rows awaiting receipt, one per location.
    paymentAtStore = (
      await prisma.stockMovement.create({
        data: {
          productId: ingredientAtStore,
          locationId: storeId,
          movementType: "purchase_payment",
          quantity: new Prisma.Decimal("0"),
          recordedById: adminId,
          occurredAt: new Date("2026-08-05T06:00:00Z"),
          purchaseSupplier: `${PREFIX} Supplier A`,
          purchaseOrderedQty: new Prisma.Decimal("50"),
          purchaseTotalCost: new Prisma.Decimal("5000"),
          purchasePaidFrom: "cash",
        },
      })
    ).id;
    // A goods delivery destined for the Restaurant (ADR-67) — the exact
    // row the SM could not see before ADR-69.
    paymentAtRestaurant = (
      await prisma.stockMovement.create({
        data: {
          productId: goodsProduct,
          locationId: restaurantId,
          movementType: "purchase_payment",
          quantity: new Prisma.Decimal("0"),
          recordedById: adminId,
          occurredAt: new Date("2026-08-05T06:30:00Z"),
          purchaseSupplier: `${PREFIX} Coast Bottlers`,
          purchaseOrderedQty: new Prisma.Decimal("12"),
          purchaseTotalCost: new Prisma.Decimal("1200"),
          purchasePaidFrom: "cash",
        },
      })
    ).id;
    paymentAtCanteen = (
      await prisma.stockMovement.create({
        data: {
          productId: goodsProduct,
          locationId: canteenId,
          movementType: "purchase_payment",
          quantity: new Prisma.Decimal("0"),
          recordedById: adminId,
          occurredAt: new Date("2026-08-05T07:00:00Z"),
          purchaseSupplier: `${PREFIX} Supplier B`,
          purchaseOrderedQty: new Prisma.Decimal("30"),
          purchaseTotalCost: new Prisma.Decimal("3000"),
          purchasePaidFrom: "cash",
        },
      })
    ).id;
  });

  async function awaitingIds(): Promise<string[]> {
    const { status, body } = await getOutstanding();
    expect(status).toBe(200);
    return body.data.awaitingReceipt.map((r: { id: string }) => r.id);
  }

  it("admin sees payments at every location", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const ids = await awaitingIds();
    expect(ids).toContain(paymentAtStore);
    expect(ids).toContain(paymentAtRestaurant);
    expect(ids).toContain(paymentAtCanteen);
  });

  it("store manager sees the RESTAURANT-destined delivery too (the bug)", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const ids = await awaitingIds();
    expect(ids).toContain(paymentAtRestaurant);
  });

  it("store manager sees the Store's, but never the Canteen's", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const ids = await awaitingIds();
    expect(ids).toContain(paymentAtStore);
    expect(ids).not.toContain(paymentAtCanteen);
  });

  it("store manager with no location link → 403", async () => {
    mockSession.current = sessionFor("store_manager", smNoLocId);
    expect((await getOutstanding()).status).toBe(403);
  });

  // INVERTED (ADR-69). The old case asserted `canteen attendant → 403
  // (route not widened to them)` — that encoded the pre-ADR-69 rule, under
  // which a Canteen-destined delivery could be paid for by the Admin and
  // then received by nobody. Receiving is by destination now, and the
  // Canteen is the attendant's.
  it("canteen attendant sees the Canteen's payments, and only those", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const ids = await awaitingIds();
    expect(ids).toContain(paymentAtCanteen);
    expect(ids).not.toContain(paymentAtStore);
    expect(ids).not.toContain(paymentAtRestaurant);
  });
});
