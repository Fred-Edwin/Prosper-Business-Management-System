import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// F7-2 — `GET /api/canteen/stock-counts/preview` role access + wiring.
// The derivation / no-write / block-signal behaviour is proven in
// `lib/domain/sales/preview-stock-count.test.ts`; here: who may call it
// and that the shape comes back.

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

const PREFIX = "__canteen_preview_route_test__";

let canteenId: string;
let attendantId: string;
let attendantNoLocId: string;
let adminId: string;
let managerId: string;
let productId: string;

async function get(qs: string) {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/canteen/stock-counts/preview${qs}`),
  );
  return { status: res.status, body: await res.json() };
}

describe("canteen stock-count preview route — role access + wiring", () => {
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
    await prisma.stockMovement.deleteMany({ where: { productId } });
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

  const qs = (over: Record<string, string> = {}) => {
    const p = new URLSearchParams({
      productId,
      countedRemaining: "990",
      ...over,
    });
    return `?${p.toString()}`;
  };

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await get(qs())).status).toBe(401);
  });

  it("store_manager → 403", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await get(qs())).status).toBe(403);
  });

  it("canteen_attendant (own canteen) → 200 with the derived figures, nothing written", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const before = await prisma.stockCount.count({ where: { productId } });
    const res = await get(qs({ countedRemaining: "980" }));
    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(false);
    expect(res.body.data.unitsSold).toBe("20.0000"); // 1000 − 980
    expect(res.body.data.revenue).toBe("1200.00");
    expect(res.body.data.isFirstCount).toBe(true);
    expect(await prisma.stockCount.count({ where: { productId } })).toBe(before);
  });

  it("counted more than expected → 200 with blocked:true (no 4xx — the screen renders the blocked state)", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await get(qs({ countedRemaining: "99999" }));
    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(true);
    expect(res.body.data.unitsSold).toBeNull();
    expect(res.body.data.exceedsExpectedBy).toBe("98999.0000");
  });

  it("blank countedRemaining → 400 VALIDATION_ERROR naming the field", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await get(qs({ countedRemaining: "" }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.field).toBe("countedRemaining");
  });

  it("attendant with no Staff location → 403", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantNoLocId);
    expect((await get(qs())).status).toBe(403);
  });
});
