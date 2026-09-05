import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `POST /api/auth/acting-as` — Admin role-switching ("acting as", NOT
// impersonation). Guarded by the caller's REAL role
// (`requireApiRole("admin")`), never `effectiveRole`.

const mockSession = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

function sessionFor(role: string, id: string, actingAs: string | null = null) {
  return {
    user: { id, name: role, role, active: true, actingAs, actingLocationId: null },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

const PREFIX = "__acting_as_route_test__";

function req(body?: unknown) {
  return {
    json: async () => {
      if (body === undefined) throw new Error("no body");
      return body;
    },
  } as unknown as Parameters<typeof import("./route").POST>[0];
}

async function call(body?: unknown) {
  const mod = await import("./route");
  const res = await mod.POST(req(body));
  return { status: res.status, body: await res.json() };
}

describe("/api/auth/acting-as", () => {
  let adminId: string;
  let smId: string;
  let storeA: string;
  let storeB: string;
  let restaurant: string;

  beforeAll(async () => {
    const [admin, sm] = await Promise.all([
      prisma.user.create({
        data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
      }),
      prisma.user.create({
        data: {
          name: `${PREFIX} SM`,
          pinHash: "x",
          role: "store_manager",
          active: true,
        },
      }),
    ]);
    adminId = admin.id;
    smId = sm.id;

    const [a, b, r] = await Promise.all([
      prisma.location.create({ data: { name: `${PREFIX} Store A`, type: "store" } }),
      prisma.location.create({ data: { name: `${PREFIX} Store B`, type: "store" } }),
      prisma.location.create({
        data: { name: `${PREFIX} Restaurant`, type: "restaurant" },
      }),
    ]);
    storeA = a.id;
    storeB = b.id;
    restaurant = r.id;
  });

  afterAll(async () => {
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await call({ role: null })).status).toBe(401);
  });

  it("non-admin real role → 403 (even if already acting as nothing)", async () => {
    mockSession.current = sessionFor("store_manager", smId);
    const res = await call({ role: "store_manager", locationId: storeA });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("admin sets store_manager + a valid locationId → 200 with resolved data + candidate list", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await call({ role: "store_manager", locationId: storeA });
    expect(res.status).toBe(200);
    expect(res.body.data.actingAs).toBe("store_manager");
    expect(res.body.data.locationId).toBe(storeA);
    expect(res.body.data.locationName).toBe(`${PREFIX} Store A`);
    // more than one active store exists → the picker needs the full list,
    // this route must not silently pick one
    const ids = res.body.data.locations.map((l: { id: string }) => l.id);
    expect(ids).toEqual(expect.arrayContaining([storeA, storeB]));
  });

  it("admin, wrong-type locationId → 400", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await call({ role: "store_manager", locationId: restaurant });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("admin, nonexistent locationId → 400", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await call({
      role: "store_manager",
      locationId: "00000000-0000-0000-0000-000000000000",
    });
    expect(res.status).toBe(400);
  });

  it("admin, staff role with no locationId → 400 on locationId", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await call({ role: "cashier" });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe("locationId");
  });

  it("role: null clears acting-as → 200 { actingAs: null }", async () => {
    mockSession.current = sessionFor("admin", adminId, "store_manager");
    const res = await call({ role: null });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ actingAs: null });
  });

  it("an admin already acting as staff can still call this route to switch back", async () => {
    // the guard checks the REAL role — an acting-as admin is not locked out
    mockSession.current = sessionFor("admin", adminId, "cashier");
    const res = await call({ role: null });
    expect(res.status).toBe(200);
  });

  it("malformed body → 400", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await call({ role: "wizard" });
    expect(res.status).toBe(400);
  });
});
