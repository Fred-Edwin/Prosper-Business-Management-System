import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Role gate + query validation only. The profit math is covered by
// lib/domain/financials/get-financial-summary.test.ts.

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

const PREFIX = "__fin_summary_route_test__";

async function get(qs: string) {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/financials/summary${qs}`),
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/financials/summary role gate", () => {
  let adminId: string;
  let cashierId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    const cashier = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
      },
    });
    adminId = admin.id;
    cashierId = cashier.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("401 unauthenticated, 403 non-admin", async () => {
    mockSession.current = null;
    expect((await get("?from=2026-05-01&to=2026-05-07")).status).toBe(401);

    mockSession.current = sessionFor("cashier", cashierId);
    expect((await get("?from=2026-05-01&to=2026-05-07")).status).toBe(403);
  });

  it("400 when the range is missing or malformed", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect((await get("")).status).toBe(400);
    expect((await get("?from=2026-05-01")).status).toBe(400);
    expect((await get("?from=nope&to=2026-05-07")).status).toBe(400);
  });

  it("200 for an admin with a valid range", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await get("?from=2026-05-01&to=2026-05-07");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("consolidated");
    expect(res.body.data).toHaveProperty("nonSaleConsumption");
    expect(res.body.data).toHaveProperty("perLocation");
  });

  it("consolidated carries ownerDrawsForPeriod (v2, §1a) as a decimal string", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await get("?from=2026-05-01&to=2026-05-07");
    expect(res.body.data.consolidated.ownerDrawsForPeriod).toMatch(
      /^-?\d+\.\d{2}$/,
    );
  });
});
