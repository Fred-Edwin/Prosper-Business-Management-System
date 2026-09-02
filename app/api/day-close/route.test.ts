import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `/api/day-close` is Admin-only, all verbs (M3-S1 / ADR-52).

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

const PREFIX = "__day_close_route_test__";
const DATE = "2019-07-04"; // fixed, far outside any other suite's range

function req(body?: unknown, query?: string) {
  return {
    nextUrl: { searchParams: new URLSearchParams(query ?? "") },
    json: async () => {
      if (body === undefined) throw new Error("no body");
      return body;
    },
  } as unknown as Parameters<
    typeof import("./route").POST
  >[0];
}

async function call(method: "GET" | "POST" | "DELETE", body?: unknown, query?: string) {
  const mod = await import("./route");
  const res = await mod[method](req(body, query));
  return { status: res.status, body: await res.json() };
}

describe("/api/day-close — admin only", () => {
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

  afterEach(async () => {
    await prisma.dayClose.deleteMany({ where: { closedBy: adminId } });
    await prisma.auditLog.deleteMany({ where: { userId: adminId } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("non-admin → 403 on every verb", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect((await call("GET")).status).toBe(403);
    expect((await call("POST", { date: DATE })).status).toBe(403);
    expect((await call("DELETE", { date: DATE })).status).toBe(403);
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await call("GET")).status).toBe(401);
  });

  it("POST seals the date (201) then GET reports it; a second POST → 409", async () => {
    mockSession.current = sessionFor("admin", adminId);

    const created = await call("POST", { date: DATE });
    expect(created.status).toBe(201);
    expect(created.body.data.date).toBe(DATE);

    const listed = await call("GET");
    expect(listed.status).toBe(200);
    expect(listed.body.data.recent.some((r: { date: string }) => r.date === DATE)).toBe(
      true,
    );

    const dup = await call("POST", { date: DATE });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("CONFLICT");
  });

  it("DELETE reopens a sealed date; reopening an open date → 404", async () => {
    mockSession.current = sessionFor("admin", adminId);
    await call("POST", { date: DATE });

    const reopened = await call("DELETE", { date: DATE });
    expect(reopened.status).toBe(200);
    expect(reopened.body.data).toEqual({ date: DATE, reopened: true });

    const missing = await call("DELETE", { date: DATE });
    expect(missing.status).toBe(404);
  });

  it("POST with a malformed date → 400", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const bad = await call("POST", { date: "04/07/2019" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
  });
});
