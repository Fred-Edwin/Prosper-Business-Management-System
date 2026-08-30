import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role access + wiring for the canteen stock-count routes. Domain
// behaviour (the derivation, the counted-more-than-expected reject, the
// same-day undo) is covered in `lib/domain/sales/*.test.ts`; here we
// assert who may call each verb and the status codes.

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

const PREFIX = "__canteen_route_test__";

let canteenId: string;
let attendantId: string;
let attendantNoLocId: string;
let adminId: string;
let managerId: string;
let productId: string;

async function post(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/canteen/stock-counts", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

async function get(qs = "") {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/canteen/stock-counts${qs}`),
  );
  return { status: res.status, body: await res.json() };
}

async function del(id: string) {
  const { DELETE } = await import("./[id]/route");
  const res = await DELETE(
    new NextRequest(`http://test/api/canteen/stock-counts/${id}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

describe("canteen stock-count routes — role access + wiring", () => {
  beforeAll(async () => {
    const canteen = await prisma.location.create({
      data: { name: `${PREFIX} Canteen`, type: "canteen", active: true },
    });
    canteenId = canteen.id;

    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Attendant`,
        role: "canteen_attendant",
        locationId: canteenId,
        dailyRate: new Prisma.Decimal("0"),
        active: true,
      },
    });
    attendantId = (
      await prisma.user.create({
        data: {
          name: `${PREFIX} Attendant`,
          pinHash: "x",
          role: "canteen_attendant",
          active: true,
          staffId: staff.id,
        },
      })
    ).id;
    attendantNoLocId = (
      await prisma.user.create({
        data: {
          name: `${PREFIX} Attendant NoLoc`,
          pinHash: "x",
          role: "canteen_attendant",
          active: true,
        },
      })
    ).id;
    adminId = (
      await prisma.user.create({
        data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
      })
    ).id;
    managerId = (
      await prisma.user.create({
        data: {
          name: `${PREFIX} Manager`,
          pinHash: "x",
          role: "store_manager",
          active: true,
        },
      })
    ).id;

    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} Soda`,
        kind: "goods",
        unitLabel: "pcs",
        productLocations: {
          create: {
            locationId: canteenId,
            sellingPrice: new Prisma.Decimal("60.00"),
            active: true,
          },
        },
      },
    });
    productId = product.id;
    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: canteenId,
        movementType: "opening",
        quantity: new Prisma.Decimal("1000"),
        recordedById: adminId,
        occurredAt: new Date("2026-08-01T06:00:00Z"),
      },
    });
  });

  afterAll(async () => {
    await prisma.moneyMovement.deleteMany({
      where: { recordedBy: { name: { startsWith: PREFIX } } },
    });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stockCount.deleteMany({ where: { productId } });
    await prisma.productLocation.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.auditLog.deleteMany({
      where: { user: { name: { startsWith: PREFIX } } },
    });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  const countBody = (over: Record<string, unknown> = {}) => ({
    productId,
    countedQuantity: "990",
    ...over,
  });

  it("unauthenticated → 401 on POST and GET", async () => {
    mockSession.current = null;
    expect((await post(countBody())).status).toBe(401);
    expect((await get()).status).toBe(401);
  });

  it("store_manager → 403 on POST and GET", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await post(countBody())).status).toBe(403);
    expect((await get()).status).toBe(403);
  });

  it("canteen_attendant → 201 on POST, then 200 on GET (own canteen)", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const created = await post(
      countBody({ countedQuantity: "980", occurredAt: "2026-08-05T06:00:00.000Z" }),
    );
    expect(created.status).toBe(201);
    expect(created.body.data.derivedSale.unitsSold).toBe("20.0000");
    expect(created.body.data.derivedSale.revenue).toBe("1200.00");

    const listed = await get();
    expect(listed.status).toBe(200);
    const row = listed.body.data.find(
      (r: { productId: string }) => r.productId === productId,
    );
    expect(row.unitsSold).toBe("20.0000");
  });

  it("admin → 200 on GET", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const listed = await get();
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body.data)).toBe(true);
  });

  it("admin → 403 on POST (attendant-only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect((await post(countBody())).status).toBe(403);
  });

  it("attendant with no Staff location → 403 on POST", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantNoLocId);
    expect((await post(countBody())).status).toBe(403);
  });

  it("counted more than expected → 400, nothing written", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const before = await prisma.stockCount.count({ where: { productId } });
    const res = await post(
      countBody({ countedQuantity: "99999", occurredAt: "2026-08-06T06:00:00.000Z" }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.stockCount.count({ where: { productId } })).toBe(before);
  });

  it("DELETE by store_manager → 403; by the attendant on a same-day count → 200", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const created = await post(countBody({ countedQuantity: "970" })); // occurredAt = now
    expect(created.status).toBe(201);
    const countId = created.body.data.count.id;

    mockSession.current = sessionFor("store_manager", managerId);
    expect((await del(countId)).status).toBe(403);

    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const undone = await del(countId);
    expect(undone.status).toBe(200);
    expect(await prisma.stockCount.count({ where: { id: countId } })).toBe(0);
  });
});
