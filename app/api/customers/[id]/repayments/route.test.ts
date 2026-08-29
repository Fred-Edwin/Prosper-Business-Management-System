import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role access + happy path for POST /api/customers/:id/repayments.

const mockSession = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));

function sessionFor(role: string, id: string, active = true) {
  return {
    user: { id, name: role, role, active },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

const PREFIX = "__repayments_route_test__";

async function postRepayment(customerId: string, payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest(`http://test/api/customers/${customerId}/repayments`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: customerId }) },
  );
  return { status: res.status, body: await res.json() };
}

describe("POST /api/customers/:id/repayments", () => {
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
      data: { name: `${PREFIX} Otieno`, phone: "0700111222" },
    });
    cashierId = cashier.id;
    managerId = manager.id;
    customerId = customer.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const uids = users.map((u) => u.id);
    const reps = await prisma.repayment.findMany({
      where: { customerId },
      select: { id: true },
    });
    await prisma.moneyMovement.deleteMany({
      where: { sourceType: "repayment", sourceId: { in: reps.map((r) => r.id) } },
    });
    await prisma.auditLog.deleteMany({ where: { userId: { in: uids } } });
    await prisma.repayment.deleteMany({ where: { customerId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.user.deleteMany({ where: { id: { in: uids } } });
    await prisma.$disconnect();
  });

  it("cashier → 201, and a matching repayment MoneyMovement is written", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await postRepayment(customerId, {
      amount: "500.00",
      account: "cash",
    });
    expect(status).toBe(201);
    expect(body.data.amount).toBe("500.00");

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "repayment", sourceId: body.data.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].amount.toFixed(2)).toBe("500.00");
    expect(mm[0].account).toBe("cash");
  });

  it("amount ≤ 0 → 400 field amount", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await postRepayment(customerId, {
      amount: "0",
      account: "cash",
    });
    expect(status).toBe(400);
    expect(body.error.field).toBe("amount");
  });

  it("unknown customer → 404", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await postRepayment("no-such-id", {
      amount: "10",
      account: "cash",
    });
    expect(status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("store_manager → 403", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    const { status } = await postRepayment(customerId, {
      amount: "10",
      account: "cash",
    });
    expect(status).toBe(403);
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    const { status } = await postRepayment(customerId, {
      amount: "10",
      account: "cash",
    });
    expect(status).toBe(401);
  });
});
