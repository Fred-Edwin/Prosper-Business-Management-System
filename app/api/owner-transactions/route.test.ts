import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Role gates only for /api/owner-transactions. Domain logic (paired
// MoneyMovement, owed-to-business, day-close) is covered by the domain
// suite.

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

const PREFIX = "__owner_txn_route_test__";

async function post(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/owner-transactions", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

async function get() {
  const { GET } = await import("./route");
  const res = await GET(new NextRequest("http://test/api/owner-transactions"));
  return { status: res.status, body: await res.json() };
}

describe("/api/owner-transactions role gates", () => {
  let adminId: string;
  let managerId: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
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
    managerId = manager.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (createdIds.length > 0) {
      await prisma.moneyMovement.deleteMany({
        where: { sourceId: { in: createdIds } },
      });
      await prisma.ownerTransaction.deleteMany({
        where: { id: { in: createdIds } },
      });
    }
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  const body = { type: "draw", amount: "1000.00", date: "2026-08-20" };

  it("401 unauthenticated, 403 non-admin", async () => {
    mockSession.current = null;
    expect((await post(body)).status).toBe(401);

    mockSession.current = sessionFor("store_manager", managerId);
    expect((await post(body)).status).toBe(403);
    expect((await get()).status).toBe(403);
  });

  it("admin can create and list", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const created = await post(body);
    expect(created.status).toBe(201);
    createdIds.push(created.body.data.id);

    const listed = await get();
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.some((t: { id: string }) => t.id === created.body.data.id),
    ).toBe(true);
  });

  it("400 on an unknown type", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await post({ ...body, type: "loan" });
    expect(res.status).toBe(400);
  });
});
