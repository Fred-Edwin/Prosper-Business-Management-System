import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// GET /api/stock-movements/balances — role access + the location-scoping
// the SM-vs-Canteen stock-levels isolation depends on (§3.3), plus the
// additive `lastMovementAt` field (§3.4).

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

const PREFIX = "__balances_route_test__";

let storeId: string;
let canteenId: string;
let smId: string;
let adminId: string;
let productId: string;
let lastReceiptAtIso: string;

async function get(qs: string) {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/stock-movements/balances${qs}`),
  );
  return { status: res.status, body: await res.json() };
}

beforeAll(async () => {
  const store = await prisma.location.create({
    data: { name: `${PREFIX} Store`, type: "store", active: true },
  });
  const canteen = await prisma.location.create({
    data: { name: `${PREFIX} Canteen`, type: "canteen", active: true },
  });
  storeId = store.id;
  canteenId = canteen.id;

  const smStaff = await prisma.staff.create({
    data: {
      name: `${PREFIX} SM`,
      role: "store_manager",
      locationId: storeId,
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
  adminId = (
    await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    })
  ).id;

  const p = await prisma.product.create({
    data: {
      name: `${PREFIX} Rice`,
      kind: "ingredient",
      unitLabel: "kg",
      buyingPrice: new Prisma.Decimal("100"),
    },
  });
  productId = p.id;

  // Same product stocked at BOTH locations — different quantities.
  await prisma.stockMovement.create({
    data: {
      productId,
      locationId: storeId,
      movementType: "opening",
      quantity: new Prisma.Decimal("100"),
      recordedById: adminId,
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    },
  });
  const lastReceipt = await prisma.stockMovement.create({
    data: {
      productId,
      locationId: storeId,
      movementType: "purchase_receipt",
      quantity: new Prisma.Decimal("25"),
      recordedById: adminId,
      occurredAt: new Date("2026-08-10T09:30:00Z"),
    },
  });
  lastReceiptAtIso = lastReceipt.occurredAt.toISOString();
  await prisma.stockMovement.create({
    data: {
      productId,
      locationId: canteenId,
      movementType: "opening",
      quantity: new Prisma.Decimal("7"),
      recordedById: adminId,
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

describe("GET /api/stock-movements/balances", () => {
  it("returns only the passed location's balance — no cross-location leak (§3.3)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await get(
      `?productIds=${productId}&locationId=${storeId}`,
    );
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].quantity).toBe("125.0000"); // 100 + 25, NOT +7 canteen
    expect(body.data[0].locationId).toBe(storeId);
  });

  it("carries lastMovementAt = the newest movement's occurredAt (§3.4)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { body } = await get(`?productIds=${productId}&locationId=${storeId}`);
    expect(body.data[0].lastMovementAt).toBe(lastReceiptAtIso);
  });

  it("a location-bound caller asking for a foreign location gets [] (§3.3)", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const { status, body } = await get(
      `?productIds=${productId}&locationId=${canteenId}`,
    );
    expect(status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("a location-bound caller asking for their OWN location gets the rows", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const { body } = await get(`?productIds=${productId}&locationId=${storeId}`);
    expect(body.data[0].quantity).toBe("125.0000");
  });
});
