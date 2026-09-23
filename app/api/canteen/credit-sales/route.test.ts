import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role access + wiring for the canteen credit-sale routes (ADR-91).
// Domain behaviour (the debt/stock write, the correction/void rules) is
// covered in `lib/domain/sales/*-canteen-credit-sale.test.ts`; here we
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

const PREFIX = "__canteen_credit_sale_route_test__";

let canteenId: string;
let attendantId: string;
let managerId: string;
let adminId: string;
let productId: string;
let customerId: string;

async function post(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/canteen/credit-sales", {
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
    new NextRequest(`http://test/api/canteen/credit-sales${qs}`),
  );
  return { status: res.status, body: await res.json() };
}

async function del(id: string) {
  const { DELETE } = await import("./[id]/route");
  const res = await DELETE(
    new NextRequest(`http://test/api/canteen/credit-sales/${id}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

async function correct(id: string, payload: unknown) {
  const { POST: correctPost } = await import("./[id]/correct/route");
  const res = await correctPost(
    new NextRequest(`http://test/api/canteen/credit-sales/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

describe("canteen credit-sale routes — role access + wiring", () => {
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
    adminId = (
      await prisma.user.create({
        data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
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
    const customer = await prisma.customer.create({
      data: { name: `${PREFIX} Customer`, phone: "0700000000" },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      select: { id: true },
    });
    await prisma.debt.deleteMany({
      where: { sourceType: "canteen_credit_sale", sourceId: { in: movements.map((m) => m.id) } },
    });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.productLocation.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.auditLog.deleteMany({
      where: { user: { name: { startsWith: PREFIX } } },
    });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  const saleBody = (over: Record<string, unknown> = {}) => ({
    productId,
    customerId,
    quantity: "2",
    ...over,
  });

  it("unauthenticated → 401 on POST and GET", async () => {
    mockSession.current = null;
    expect((await post(saleBody())).status).toBe(401);
    expect((await get()).status).toBe(401);
  });

  it("store_manager → 403 on POST and GET", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await post(saleBody())).status).toBe(403);
    expect((await get()).status).toBe(403);
  });

  it("canteen_attendant → 201 on POST, then 200 on GET listing it", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const created = await post(saleBody());
    expect(created.status).toBe(201);
    expect(created.body.data.total).toBe("120.00");

    const listed = await get();
    expect(listed.status).toBe(200);
    const row = listed.body.data.find(
      (r: { stockMovementId: string }) =>
        r.stockMovementId === created.body.data.stockMovement.id,
    );
    expect(row).toBeDefined();
    expect(row.voidable).toBe(true);
  });

  it("admin → 403 on POST (attendant-only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect((await post(saleBody())).status).toBe(403);
  });

  it("DELETE by store_manager → 403; by the attendant on a same-day sale → 200", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const created = await post(saleBody());
    const stockMovementId = created.body.data.stockMovement.id;

    mockSession.current = sessionFor("store_manager", managerId);
    expect((await del(stockMovementId)).status).toBe(403);

    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const voided = await del(stockMovementId);
    expect(voided.status).toBe(200);
  });

  it("POST .../correct → 403 for a non-admin; 201 for an admin", async () => {
    mockSession.current = sessionFor("canteen_attendant", attendantId);
    const created = await post(saleBody());
    const stockMovementId = created.body.data.stockMovement.id;

    mockSession.current = sessionFor("canteen_attendant", attendantId);
    expect((await correct(stockMovementId, { quantity: "5" })).status).toBe(403);

    mockSession.current = sessionFor("admin", adminId);
    const corrected = await correct(stockMovementId, { quantity: "5" });
    expect(corrected.status).toBe(201);
    expect(corrected.body.data.total).toBe("300.00");
  });
});
