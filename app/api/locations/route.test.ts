import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// Regression guard for Session 14 / D1 — companion to
// `app/api/products/route.test.ts`. The staff stock hooks fetch
// `GET /api/locations` for the transfer destination picker; the route
// was `admin`-only and 403'd every staff stock screen on load.

const mockSession = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

function sessionFor(role: string, active = true) {
  return {
    user: { id: `test-${role}`, name: role, role, active },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

async function getLocations() {
  const { GET } = await import("./route");
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

describe("GET /api/locations — role access (D1 regression)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("store_manager gets 200 (not 403)", async () => {
    mockSession.current = sessionFor("store_manager");
    const { status, body } = await getLocations();
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("canteen_attendant gets 200 (not 403)", async () => {
    mockSession.current = sessionFor("canteen_attendant");
    const { status } = await getLocations();
    expect(status).toBe(200);
  });

  it("admin still gets 200", async () => {
    mockSession.current = sessionFor("admin");
    const { status } = await getLocations();
    expect(status).toBe(200);
  });

  it("cashier is still 403", async () => {
    mockSession.current = sessionFor("cashier");
    const { status, body } = await getLocations();
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
