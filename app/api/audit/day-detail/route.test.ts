import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `/api/audit/day-detail` is Admin-only, read-only (M5 S11). Gate only —
// the read is proven in `lib/domain/audit/day-detail-reconciliation.test.ts`.

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

const PREFIX = "__day_detail_route_test__";

function req(query?: string) {
  return {
    nextUrl: { searchParams: new URLSearchParams(query ?? "") },
  } as unknown as Parameters<typeof import("./route").GET>[0];
}

async function call(query?: string) {
  const mod = await import("./route");
  const res = await mod.GET(req(query));
  return { status: res.status, body: await res.json() };
}

describe("/api/audit/day-detail — admin only", () => {
  let adminId: string;
  let managerId: string;

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
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("401 with no session", async () => {
    mockSession.current = null;
    const { status, body } = await call("date=2024-01-01");
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("403 for a non-admin", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    const { status, body } = await call("date=2024-01-01");
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("400 without a date", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call();
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("200 for an admin on an empty date", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("date=2024-01-01");
    expect(status).toBe(200);
    expect(body.data.businessDate).toBe("2024-01-01");
    expect(body.data.orders).toEqual([]);
    expect(body.data.closed).toBe(false);
  });
});
