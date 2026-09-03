import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
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

async function getLocations(query = "") {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/locations${query}`, { method: "GET" }),
  );
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

  // Session 9C — the /admin/catalog Locations tab needs deactivated rows.
  it("admin + ?includeInactive=1 returns inactive locations too", async () => {
    mockSession.current = sessionFor("admin");
    const marker = `__loc_inactive_test_${Date.now()}__`;
    const inactive = await prisma.location.create({
      data: { name: marker, type: "store", active: false },
    });
    try {
      const plain = await getLocations();
      expect(
        plain.body.data.some((l: { id: string }) => l.id === inactive.id),
      ).toBe(false);

      const withInactive = await getLocations("?includeInactive=1");
      expect(
        withInactive.body.data.some((l: { id: string }) => l.id === inactive.id),
      ).toBe(true);
    } finally {
      await prisma.location.delete({ where: { id: inactive.id } });
    }
  });

  it("non-admin cannot widen with ?includeInactive=1", async () => {
    mockSession.current = sessionFor("store_manager");
    const marker = `__loc_inactive_sm_${Date.now()}__`;
    const inactive = await prisma.location.create({
      data: { name: marker, type: "store", active: false },
    });
    try {
      const { status, body } = await getLocations("?includeInactive=1");
      expect(status).toBe(200);
      expect(
        body.data.some((l: { id: string }) => l.id === inactive.id),
      ).toBe(false);
    } finally {
      await prisma.location.delete({ where: { id: inactive.id } });
    }
  });
});
