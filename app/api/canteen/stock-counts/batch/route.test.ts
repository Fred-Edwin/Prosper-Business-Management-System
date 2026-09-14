import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role access + wiring for the K1 batch count route. Domain behaviour
// (independent per-line derivation, all-or-nothing rejection, empty /
// duplicate lines) is covered in
// `lib/domain/sales/record-stock-count-batch.test.ts`; here we assert who
// may call the route and the status codes / response shape.

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

const PREFIX = "__canteen_batch_route_test__";

let canteenId: string;
let attendantId: string;
let attendantNoLocId: string;
let adminId: string;
let managerId: string;
let sodaId: string;
let mandaziId: string;

async function post(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/canteen/stock-counts/batch", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

describe("canteen stock-count batch route — role access + wiring", () => {
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

    const soda = await prisma.product.create({
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
    sodaId = soda.id;
    const mandazi = await prisma.product.create({
      data: {
        name: `${PREFIX} Mandazi`,
        kind: "goods",
        unitLabel: "pcs",
        productLocations: {
          create: {
            locationId: canteenId,
            sellingPrice: new Prisma.Decimal("20.00"),
            active: true,
          },
        },
      },
    });
    mandaziId = mandazi.id;

    await prisma.stockMovement.createMany({
      data: [
        {
          productId: sodaId,
          locationId: canteenId,
          movementType: "opening",
          quantity: new Prisma.Decimal("100"),
          recordedById: adminId,
          occurredAt: new Date("2026-08-01T06:00:00Z"),
        },
        {
          productId: mandaziId,
          locationId: canteenId,
          movementType: "opening",
          quantity: new Prisma.Decimal("40"),
          recordedById: adminId,
          occurredAt: new Date("2026-08-01T06:00:00Z"),
        },
      ],
    });
  });

  afterAll(async () => {
    const productIds = [sodaId, mandaziId];
    await prisma.moneyMovement.deleteMany({
      where: { recordedBy: { name: { startsWith: PREFIX } } },
    });
    await prisma.stockMovement.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.stockCount.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productLocation.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.auditLog.deleteMany({
      where: { user: { name: { startsWith: PREFIX } } },
    });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect(
      (
        await post({
          lines: [{ productId: sodaId, countedQuantity: "80" }],
        })
      ).status,
    ).toBe(401);
  });

  it("store_manager → 403", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect(
      (
        await post({
          lines: [{ productId: sodaId, countedQuantity: "80" }],
        })
      ).status,
    ).toBe(403);
  });

  it("admin → 403 (attendant-only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect(
      (
        await post({
          lines: [{ productId: sodaId, countedQuantity: "80" }],
        })
      ).status,
    ).toBe(403);
  });

  it("attendant with no Staff location → 403", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantNoLocId);
    expect(
      (
        await post({
          lines: [{ productId: sodaId, countedQuantity: "80" }],
        })
      ).status,
    ).toBe(403);
  });

  it("canteen_attendant → 201, two independent lines recorded in one call", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await post({
      lines: [
        { productId: sodaId, countedQuantity: "80" },
        { productId: mandaziId, countedQuantity: "12" },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].derivedSale.unitsSold).toBe("20.0000");
    expect(res.body.data[1].derivedSale.unitsSold).toBe("28.0000");
  });

  it("one line over expected stock → 400, nothing written for either line", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const beforeSoda = await prisma.stockCount.count({ where: { productId: sodaId } });
    const res = await post({
      lines: [
        { productId: sodaId, countedQuantity: "5" }, // valid on its own
        { productId: mandaziId, countedQuantity: "99999" }, // over
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.stockCount.count({ where: { productId: sodaId } })).toBe(
      beforeSoda,
    );
  });

  it("empty lines → 400", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await post({ lines: [] });
    expect(res.status).toBe(400);
  });

  it("duplicate productId across lines → 400", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const res = await post({
      lines: [
        { productId: sodaId, countedQuantity: "1" },
        { productId: sodaId, countedQuantity: "2" },
      ],
    });
    expect(res.status).toBe(400);
  });
});
