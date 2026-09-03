import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `GET /api/admin/dashboard` is Admin-only (M5 S13). This suite covers
// the gate + response shape only — the aggregation behaviour is proven in
// `lib/domain/dashboard/*.test.ts`.

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

const PREFIX = "__dashboard_route_test__";

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

describe("/api/admin/dashboard — admin only", () => {
  let adminId: string;
  let cashierId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    const cashier = await prisma.user.create({
      data: { name: `${PREFIX} Cashier`, pinHash: "x", role: "cashier", active: true },
    });
    adminId = admin.id;
    cashierId = cashier.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("401 with no session", async () => {
    mockSession.current = null;
    const { status, body } = await call();
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("403 for a non-admin", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await call();
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("200 for an admin — all five bands present", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("date=2025-03-05");
    expect(status).toBe(200);
    expect(body.data).toMatchObject({ date: "2025-03-05" });
    for (const band of [
      "position",
      "week",
      "needsAttention",
      "today",
      "trend",
    ]) {
      expect(body.data, band).toHaveProperty(band);
    }
    expect(body.data.week.dailyNet).toHaveLength(7);
    expect(body.data.trend.dailyNet).toHaveLength(30);
  });

  it("defaults date to today when omitted", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("400 on a malformed date", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("date=2025-3-5");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.field).toBe("date");
  });
});
