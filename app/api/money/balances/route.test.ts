import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

// `/api/money/balances` is Admin-only (plan §4 / handoff §3).

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

const PREFIX = "__money_balances_route_test__";

async function getBalances() {
  const { GET } = await import("./route");
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

describe("GET /api/money/balances — admin only", () => {
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

  it("admin → 200 with cash + mpesaBank decimal strings", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await getBalances();
    expect(status).toBe(200);
    expect(typeof body.data.cash).toBe("string");
    expect(typeof body.data.mpesaBank).toBe("string");
    expect(body.data.cash).toMatch(/^-?\d+\.\d{2}$/);
  });

  it("cashier → 403", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await getBalances();
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await getBalances()).status).toBe(401);
  });
});
