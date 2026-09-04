import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `GET /api/admin/dashboard/trend` is Admin-only (v2 Session B). Covers
// the gate + response shape + validation only — `dailyNetSeries`'s
// aggregation behaviour is proven in `lib/domain/dashboard/trend-series.test.ts`.

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

const PREFIX = "__dashboard_trend_route_test__";

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

describe("/api/admin/dashboard/trend — admin only", () => {
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
    const { status, body } = await call("from=2025-03-01&to=2025-03-05");
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("403 for a non-admin", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await call("from=2025-03-01&to=2025-03-05");
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("200 for an admin — one entry per day in range, decimal-string nets", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("from=2025-03-01&to=2025-03-05");
    expect(status).toBe(200);
    expect(body.data).toMatchObject({ from: "2025-03-01", to: "2025-03-05" });
    expect(body.data.dailyNet).toHaveLength(5);
    for (const row of body.data.dailyNet) {
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.net).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("400 when from or to is missing", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("from=2025-03-01");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 on a malformed date", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("from=2025-3-1&to=2025-03-05");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.field).toBe("from");
  });

  it("400 when from is after to", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("from=2025-03-05&to=2025-03-01");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.field).toBe("from");
  });
});
