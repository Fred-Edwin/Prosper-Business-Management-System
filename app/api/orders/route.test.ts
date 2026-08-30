import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role access + happy paths for the order routes. Domain behaviour is
// covered in `lib/domain/sales/*.test.ts`; here we assert the route wiring:
// who may call each verb, the status codes, and that a Cashier's GET is
// scoped to their own orders.

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

const PREFIX = "__orders_route_test__";

let restaurantId: string;
let cashierAId: string;
let cashierBId: string;
let adminId: string;
let managerId: string;
let attendantId: string;
let productId: string;
let orderAId: string;

async function post(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

async function get(qs = "") {
  const { GET } = await import("./route");
  const res = await GET(new NextRequest(`http://test/api/orders${qs}`));
  return { status: res.status, body: await res.json() };
}

async function patch(id: string, payload: unknown) {
  const { PATCH } = await import("./[id]/route");
  const res = await PATCH(
    new NextRequest(`http://test/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

async function correct(id: string, payload: unknown) {
  const { POST } = await import("./[id]/correct/route");
  const res = await POST(
    new NextRequest(`http://test/api/orders/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

const line = () => ({ productId, quantity: "1" });
const cashOrder = () => ({
  orderType: "dine_in",
  paymentMethod: "cash",
  lines: [line()],
});

describe("order routes — role access + wiring", () => {
  beforeAll(async () => {
    const restaurant = await prisma.location.create({
      data: { name: `${PREFIX} Restaurant`, type: "restaurant", active: true },
    });
    restaurantId = restaurant.id;
    // The routes don't pass a `restaurantId` (production has exactly one
    // active Restaurant), so `resolveRestaurantId` picks the oldest active
    // one. Other parallel test files leave `__*_test__` restaurants around;
    // deactivate only those so resolution lands on ours. A real
    // (non-prefixed) Restaurant, if one existed, is left untouched.
    await prisma.location.updateMany({
      where: {
        type: "restaurant",
        active: true,
        name: { startsWith: "__" },
        NOT: { id: restaurant.id },
      },
      data: { active: false },
    });

    const mk = (role: string, n: string) =>
      prisma.user.create({
        data: { name: `${PREFIX} ${n}`, pinHash: "x", role: role as never, active: true },
      });
    cashierAId = (await mk("cashier", "CashierA")).id;
    cashierBId = (await mk("cashier", "CashierB")).id;
    adminId = (await mk("admin", "Admin")).id;
    managerId = (await mk("store_manager", "Manager")).id;
    attendantId = (await mk("canteen_attendant", "Attendant")).id;

    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Widget`,
        kind: "goods",
        unitLabel: "unit",
        productLocations: {
          create: {
            locationId: restaurantId,
            sellingPrice: new Prisma.Decimal("100.00"),
            active: true,
          },
        },
      },
    });
    productId = product.id;
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: restaurantId,
        movementType: "opening",
        quantity: new Prisma.Decimal("1000"),
        recordedById: adminId,
        occurredAt: new Date("2026-08-01T06:00:00Z"),
      },
    });
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({
      where: { locationId: restaurantId },
      select: { id: true },
    });
    const oids = orders.map((o) => o.id);
    await prisma.moneyMovement.deleteMany({
      where: { sourceType: "order", sourceId: { in: oids } },
    });
    await prisma.debt.deleteMany({ where: { orderId: { in: oids } } });
    await prisma.stockMovement.deleteMany({ where: { orderId: { in: oids } } });
    await prisma.orderLine.deleteMany({ where: { orderId: { in: oids } } });
    await prisma.order.updateMany({
      where: { id: { in: oids } },
      data: { correctsOrderId: null },
    });
    await prisma.order.deleteMany({ where: { id: { in: oids } } });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.productLocation.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  // ── POST /api/orders ──────────────────────────────────────────────
  it("cashier → 201 on POST", async () => {
    mockSession.current = sessionFor("cashier", cashierAId);
    const { status, body } = await post(cashOrder());
    expect(status).toBe(201);
    expect(body.data.total).toBe("100.00");
    orderAId = body.data.id;
  });

  it("admin → 403 on POST (cashier only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status } = await post(cashOrder());
    expect(status).toBe(403);
  });

  it("store_manager / canteen_attendant → 403 on POST", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await post(cashOrder())).status).toBe(403);
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    expect((await post(cashOrder())).status).toBe(403);
  });

  it("unauthenticated → 401 on POST", async () => {
    mockSession.current = null;
    expect((await post(cashOrder())).status).toBe(401);
  });

  it("bad body → 400 on POST", async () => {
    mockSession.current = sessionFor("cashier", cashierAId);
    const { status, body } = await post({ orderType: "dine_in" });
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // ── GET /api/orders ───────────────────────────────────────────────
  it("cashier B → 200 and sees none of cashier A's orders", async () => {
    mockSession.current = sessionFor("cashier", cashierBId);
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body.data.every((o: { cashierId: string }) => o.cashierId === cashierBId)).toBe(
      true,
    );
  });

  it("admin → 200 and sees cashier A's order", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body.data.some((o: { id: string }) => o.id === orderAId)).toBe(true);
  });

  it("store_manager → 403 on GET", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await get()).status).toBe(403);
  });

  it("unauthenticated → 401 on GET", async () => {
    mockSession.current = null;
    expect((await get()).status).toBe(401);
  });

  // ── PATCH /api/orders/:id ─────────────────────────────────────────
  it("cashier A → 200 editing their own same-day order", async () => {
    mockSession.current = sessionFor("cashier", cashierAId);
    const { status, body } = await patch(orderAId, {
      orderType: "dine_in",
      paymentMethod: "cash",
      lines: [{ productId, quantity: "2" }],
    });
    expect(status).toBe(200);
    expect(body.data.total).toBe("200.00");
  });

  it("cashier B → 403 editing cashier A's order", async () => {
    mockSession.current = sessionFor("cashier", cashierBId);
    const { status } = await patch(orderAId, {
      orderType: "dine_in",
      paymentMethod: "cash",
      lines: [{ productId, quantity: "2" }],
    });
    expect(status).toBe(403);
  });

  it("admin → 403 on PATCH (cashier only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status } = await patch(orderAId, {
      orderType: "dine_in",
      paymentMethod: "cash",
      lines: [{ productId, quantity: "2" }],
    });
    expect(status).toBe(403);
  });

  // ── POST /api/orders/:id/correct ──────────────────────────────────
  it("cashier → 403 on /correct", async () => {
    mockSession.current = sessionFor("cashier", cashierAId);
    const { status } = await correct(orderAId, {
      orderType: "dine_in",
      paymentMethod: "cash",
      lines: [{ productId, quantity: "1" }],
    });
    expect(status).toBe(403);
  });

  it("admin → 201 on /correct", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await correct(orderAId, {
      orderType: "dine_in",
      paymentMethod: "cash",
      lines: [{ productId, quantity: "1" }],
    });
    expect(status).toBe(201);
    expect(body.data.correctsOrderId).toBe(orderAId);
  });

  it("store_manager / canteen_attendant → 403 on /correct", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect(
      (
        await correct(orderAId, {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId, quantity: "1" }],
        })
      ).status,
    ).toBe(403);
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    expect(
      (
        await correct(orderAId, {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId, quantity: "1" }],
        })
      ).status,
    ).toBe(403);
  });

  it("unauthenticated → 401 on /correct", async () => {
    mockSession.current = null;
    expect(
      (
        await correct(orderAId, {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId, quantity: "1" }],
        })
      ).status,
    ).toBe(401);
  });
});
