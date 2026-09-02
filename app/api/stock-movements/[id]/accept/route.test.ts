import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// POST /api/stock-movements/:id/accept — phase 2 of the 2-phase transfer.
// Here: the receiving Canteen Attendant may accept with an ADJUSTED
// quantity (the receive-transfer flow), and a non-destination caller is
// still 403.

const mockSession = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

function sessionFor(role: string, id: string) {
  return {
    user: { id, name: role, role, active: true },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

const PREFIX = "__accept_route_test__";

let restaurantId: string;
let canteenId: string;
let storeId: string;
let caId: string;
let smId: string;
let recorderId: string;
let productId: string;

async function post(id: string, body?: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest(`http://test/api/stock-movements/${id}/accept`, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

/** A fresh pending Restaurant → Canteen dispatch of `qty`. */
async function pendingDispatch(qty: string) {
  return prisma.stockMovement.create({
    data: {
      productId,
      locationId: restaurantId,
      movementType: "transfer",
      quantity: new Prisma.Decimal(qty).negated(),
      recordedById: recorderId,
      occurredAt: new Date(),
      transferCounterpartLocationId: canteenId,
      note: "Transfer dispatched — awaiting receipt",
    },
  });
}

beforeAll(async () => {
  const [restaurant, canteen, store] = await Promise.all([
    prisma.location.create({
      data: { name: `${PREFIX} Restaurant`, type: "restaurant", active: true },
    }),
    prisma.location.create({
      data: { name: `${PREFIX} Canteen`, type: "canteen", active: true },
    }),
    prisma.location.create({
      data: { name: `${PREFIX} Store`, type: "store", active: true },
    }),
  ]);
  restaurantId = restaurant.id;
  canteenId = canteen.id;
  storeId = store.id;

  const caStaff = await prisma.staff.create({
    data: {
      name: `${PREFIX} CA`,
      role: "canteen_attendant",
      locationId: canteenId,
      dailyRate: new Prisma.Decimal("0"),
      active: true,
    },
  });
  const smStaff = await prisma.staff.create({
    data: {
      name: `${PREFIX} SM`,
      role: "store_manager",
      locationId: storeId,
      dailyRate: new Prisma.Decimal("0"),
      active: true,
    },
  });
  caId = (
    await prisma.user.create({
      data: {
        name: `${PREFIX} CA`,
        pinHash: "x",
        role: "canteen_attendant",
        active: true,
        staffId: caStaff.id,
      },
    })
  ).id;
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
  recorderId = (
    await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    })
  ).id;

  const product = await prisma.product.create({
    data: { name: `${PREFIX} Chapati`, kind: "dish", unitLabel: "pcs", buyingPrice: "0" },
  });
  productId = product.id;
  await prisma.stockMovement.create({
    data: {
      productId,
      locationId: restaurantId,
      movementType: "production",
      quantity: new Prisma.Decimal("200"),
      recordedById: recorderId,
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    },
  });
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe("POST /api/stock-movements/:id/accept — adjusted receipt", () => {
  it("the receiving Canteen Attendant may accept with an adjusted quantity → 201", async () => {
    const dispatch = await pendingDispatch("30");
    mockSession.current = sessionFor("canteen_attendant", caId);

    const { status, body } = await post(dispatch.id, { receivedQuantity: "27" });
    expect(status).toBe(201);
    // F6 (owner decision 2026-09-02): a short accept books a PAIR at the
    // destination — the receipt lands the full dispatched 30, and a
    // `variance` row writes the missing 3 off, so the loss is summable
    // rather than free text. The canteen still nets the 27 that arrived.
    expect(body.data.quantity).toBe("30.0000");
    expect(body.data.locationId).toBe(canteenId);
    expect(body.data.correctsMovementId).toBe(dispatch.id);
    expect(body.data.note).toContain("Received 27");

    const variance = await prisma.stockMovement.findFirst({
      where: { productId, movementType: "variance", locationId: canteenId },
      orderBy: { createdAt: "desc" },
    });
    expect(variance?.quantity.toFixed(4)).toBe("-3.0000");

    const net = await prisma.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { productId, locationId: canteenId },
    });
    expect(net._sum.quantity?.toFixed(4)).toBe("27.0000");
  });

  it("a plain accept (no body) still lands the dispatched amount → 201", async () => {
    const dispatch = await pendingDispatch("15");
    mockSession.current = sessionFor("canteen_attendant", caId);

    const { status, body } = await post(dispatch.id);
    expect(status).toBe(201);
    expect(body.data.quantity).toBe("15.0000");
    expect(body.data.note).toBe("Transfer received");
  });

  it("a non-destination caller (the sending Store's SM) is still 403", async () => {
    const dispatch = await pendingDispatch("10");
    mockSession.current = sessionFor("store_manager", smId);

    const { status } = await post(dispatch.id, { receivedQuantity: "8" });
    expect(status).toBe(403);
  });

  it("rejects a negative receivedQuantity → 400", async () => {
    const dispatch = await pendingDispatch("10");
    mockSession.current = sessionFor("canteen_attendant", caId);

    const { status } = await post(dispatch.id, { receivedQuantity: "-3" });
    expect(status).toBe(400);
  });
});
