import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `/api/audit` is Admin-only (M5 S11). This suite covers the gate only —
// the read behaviour is proven in `lib/domain/audit/list-audit-log.test.ts`.

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

const PREFIX = "__audit_route_test__";

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

describe("/api/audit — admin only", () => {
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

  it("200 for an admin", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("from=2024-01-01&to=2024-01-01");
    expect(status).toBe(200);
    expect(body.data).toHaveProperty("entries");
    expect(body.data).toHaveProperty("page");
  });

  it("400 on a malformed date", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await call("from=not-a-date");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
