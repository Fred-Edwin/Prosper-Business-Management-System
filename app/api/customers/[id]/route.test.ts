import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

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

const PREFIX = "__customer_detail_route_test__";

async function getLedger(customerId: string) {
  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest(`http://test/api/customers/${customerId}`),
    { params: Promise.resolve({ id: customerId }) },
  );
  return { status: res.status, body: await res.json() };
}

describe("GET /api/customers/:id", () => {
  let cashierId: string;
  let managerId: string;
  let customerId: string;

  beforeAll(async () => {
    const cashier = await prisma.user.create({
      data: {
        name: `${PREFIX} Cashier`,
        pinHash: "x",
        role: "cashier",
        active: true,
      },
    });
    const manager = await prisma.user.create({
      data: {
        name: `${PREFIX} Manager`,
        pinHash: "x",
        role: "store_manager",
        active: true,
      },
    });
    const customer = await prisma.customer.create({
      data: { name: `${PREFIX} Wanjiku`, phone: "0700333444" },
    });
    cashierId = cashier.id;
    managerId = manager.id;
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("cashier → 200 with an empty ledger and zero balance", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await getLedger(customerId);
    expect(status).toBe(200);
    expect(body.data.customer.id).toBe(customerId);
    expect(body.data.entries).toEqual([]);
    expect(body.data.balance).toBe("0.00");
  });

  it("unknown customer → 404", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await getLedger("no-such-id");
    expect(status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("store_manager → 403", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await getLedger(customerId)).status).toBe(403);
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    expect((await getLedger(customerId)).status).toBe(401);
  });
});
