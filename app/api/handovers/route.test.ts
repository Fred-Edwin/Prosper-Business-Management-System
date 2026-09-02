import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role gates only for /api/handovers (GET list, POST declare). Domain
// logic (variance, corrections, gates) is covered by the domain suite.

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

const PREFIX = "__handovers_route_test__";

async function getList() {
  const { GET } = await import("./route");
  const res = await GET(new NextRequest("http://test/api/handovers"));
  return { status: res.status, body: await res.json() };
}

async function postDeclare(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/handovers", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/handovers role gates", () => {
  let adminId: string;
  let cashierId: string;
  let managerId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({
      data: { name: `${PREFIX} Restaurant`, type: "restaurant", active: true },
    });
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Cashier`,
        role: "cashier",
        locationId: location.id,
        dailyRate: new Prisma.Decimal("0"),
        active: true,
      },
    });
    const cashier = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
        staffId: staff.id,
      },
    });
    const manager = await prisma.user.create({
      data: {
        name: `${PREFIX} Manager`,
        pinHash: "x",
        role: "store_manager",
        active: true,
      },
    });
    adminId = admin.id;
    cashierId = cashier.id;
    managerId = manager.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const uids = users.map((u) => u.id);
    const handovers = await prisma.handover.findMany({
      where: { location: { name: { startsWith: PREFIX } } },
      select: { id: true },
    });
    const hids = handovers.map((h) => h.id);
    if (hids.length > 0) {
      const receipts = await prisma.receiptOfHandover.findMany({
        where: { handoverId: { in: hids } },
        select: { id: true },
      });
      await prisma.handoverShortfall.deleteMany({
        where: { receiptOfHandoverId: { in: receipts.map((r) => r.id) } },
      });
      await prisma.receiptOfHandover.deleteMany({
        where: { handoverId: { in: hids } },
      });
      await prisma.handover.updateMany({
        where: { id: { in: hids } },
        data: { correctsHandoverId: null },
      });
      await prisma.handover.deleteMany({ where: { id: { in: hids } } });
    }
    await prisma.auditLog.deleteMany({ where: { userId: { in: uids } } });
    await prisma.user.deleteMany({ where: { id: { in: uids } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("GET: unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await getList()).status).toBe(401);
  });

  it("GET: cashier → 200 (own rows)", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect((await getList()).status).toBe(200);
  });

  it("GET: admin → 200 (all rows)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect((await getList()).status).toBe(200);
  });

  it("POST declare: cashier → 201", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await postDeclare({
      cashDeclared: "1000.00",
      mpesaDeclared: "200.00",
    });
    expect(status).toBe(201);
    expect(body.data.cashDeclared).toBe("1000.00");
  });

  it("POST declare: admin → 403 (declaring is staff-only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect((await postDeclare({ cashDeclared: "1", mpesaDeclared: "0" })).status).toBe(
      403,
    );
  });

  it("POST declare: store_manager → 403", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await postDeclare({ cashDeclared: "1", mpesaDeclared: "0" })).status).toBe(
      403,
    );
  });
});
