import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toBusinessDate } from "@/lib/time";

// Role gate + thin-handler wiring for POST /api/handovers/backdated.
// Domain rules (staff/location match, day-close role gate, duplicate
// guard) are covered by lib/domain/handovers/record-handover-for-date.test.ts.

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

const PREFIX = "__handovers_backdated_route_test__";

async function postBackdated(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/handovers/backdated", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/handovers/backdated role gate", () => {
  let adminId: string;
  let cashierId: string;
  let restaurantId: string;
  let cashierStaffId: string;
  const businessDate = toBusinessDate(new Date("2019-05-07T09:00:00Z"));

  beforeAll(async () => {
    const location = await prisma.location.create({
      data: { name: `${PREFIX} Restaurant`, type: "restaurant", active: true },
    });
    restaurantId = location.id;
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
    cashierStaffId = staff.id;
    const cashier = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
        staffId: staff.id,
      },
    });
    adminId = admin.id;
    cashierId = cashier.id;
  });

  afterAll(async () => {
    const handovers = await prisma.handover.findMany({
      where: { location: { name: { startsWith: PREFIX } } },
      select: { id: true },
    });
    const hids = handovers.map((h) => h.id);
    if (hids.length > 0) {
      await prisma.handover.updateMany({
        where: { id: { in: hids } },
        data: { correctsHandoverId: null },
      });
      await prisma.handover.deleteMany({ where: { id: { in: hids } } });
    }
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const uids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { userId: { in: uids } } });
    await prisma.user.deleteMany({ where: { id: { in: uids } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await postBackdated({})).status).toBe(401);
  });

  it("cashier → 403 (back-entry is Admin-only)", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect(
      (
        await postBackdated({
          staffId: cashierStaffId,
          locationId: restaurantId,
          cashDeclared: "1",
          mpesaDeclared: "0",
          businessDate,
        })
      ).status,
    ).toBe(403);
  });

  it("admin → 201, creates the handover", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await postBackdated({
      staffId: cashierStaffId,
      locationId: restaurantId,
      cashDeclared: "3428.00",
      mpesaDeclared: "8362.00",
      businessDate,
    });
    expect(status).toBe(201);
    expect(body.data.cashDeclared).toBe("3428.00");
    expect(body.data.mpesaDeclared).toBe("8362.00");
  });

  it("admin, malformed body → 400 VALIDATION_ERROR", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await postBackdated({
      staffId: cashierStaffId,
      locationId: restaurantId,
      cashDeclared: "not-a-number",
      mpesaDeclared: "0",
      businessDate,
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
