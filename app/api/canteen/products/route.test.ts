import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

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

const PREFIX = "__canteen_products_route_test__";

let canteenId: string;
let attendantId: string;
let attendantNoLocId: string;
let adminId: string;
let cashierId: string;
let productId: string;

async function get(qs = "") {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/canteen/products${qs}`),
  );
  return { status: res.status, body: await res.json() };
}

describe("GET /api/canteen/products", () => {
  beforeAll(async () => {
    const canteen = await prisma.location.create({
      data: { name: `${PREFIX} Canteen`, type: "canteen", active: true },
    });
    canteenId = canteen.id;

    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Attendant Staff`,
        role: "canteen_attendant",
        locationId: canteen.id,
        dailyRate: new Prisma.Decimal("500.00"),
      },
    });
    const attUser = await prisma.user.create({
      data: {
        name: `${PREFIX} Attendant`,
        pinHash: "x",
        role: "canteen_attendant",
        staffId: staff.id,
        active: true,
      },
    });
    attendantId = attUser.id;

    const attNoLoc = await prisma.user.create({
      data: {
        name: `${PREFIX} Attendant No Loc`,
        pinHash: "x",
        role: "canteen_attendant",
        active: true,
      },
    });
    attendantNoLocId = attNoLoc.id;

    const admin = await prisma.user.create({
      data: {
        name: `${PREFIX} Admin`,
        pinHash: "x",
        role: "admin",
        active: true,
      },
    });
    adminId = admin.id;

    const cashier = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
      },
    });
    cashierId = cashier.id;

    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Mandazi`,
        kind: "goods",
        unitLabel: "pcs",
        category: "Bakery",
        productLocations: {
          create: {
            locationId: canteen.id,
            sellingPrice: new Prisma.Decimal("20.00"),
            active: true,
          },
        },
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.productLocation.deleteMany({
      where: { location: { name: { startsWith: PREFIX } } },
    });
    await prisma.product.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.staff.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.location.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.$disconnect();
  });

  it("401 for unauthenticated", async () => {
    mockSession.current = null;
    const res = await get();
    expect(res.status).toBe(401);
  });

  it("403 for unauthorized roles (e.g. cashier)", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const res = await get();
    expect(res.status).toBe(403);
  });

  it("403 for canteen_attendant not assigned to a canteen", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantNoLocId);
    const res = await get();
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/not assigned to a canteen/i);
  });

  it("200 for canteen_attendant returning their canteen products", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await get();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((p: { id: string }) => p.id === productId);
    expect(found).toBeDefined();
    expect(found.name).toBe(`${PREFIX} Mandazi`);
    expect(found.sellingPrice).toBe("20.00");
    expect(found.category).toBe("Bakery");
  });

  it("200 for admin returning canteen products", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await get(`?locationId=${canteenId}`);
    expect(res.status).toBe(200);
    const found = res.body.data.find((p: { id: string }) => p.id === productId);
    expect(found).toBeDefined();
  });
});
