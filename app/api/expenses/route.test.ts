import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Role gates only for /api/expenses and /api/expenses/:id/correct. Domain
// logic (paired MoneyMovement, correction-stacking, day-close) is covered
// by the financials domain suite.

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

const PREFIX = "__expenses_route_test__";

async function postExpense(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

async function getExpenses() {
  const { GET } = await import("./route");
  const res = await GET(new NextRequest("http://test/api/expenses"));
  return { status: res.status, body: await res.json() };
}

async function postCorrect(id: string, payload: unknown) {
  const { POST } = await import("./[id]/correct/route");
  const res = await POST(
    new NextRequest(`http://test/api/expenses/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/expenses role gates", () => {
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
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const expenses = await prisma.expense.findMany({
      where: { recordedById: { in: ids } },
      select: { id: true },
    });
    const eIds = expenses.map((e) => e.id);
    if (eIds.length > 0) {
      await prisma.expense.updateMany({
        where: { id: { in: eIds } },
        data: { correctsExpenseId: null },
      });
      await prisma.moneyMovement.deleteMany({
        where: { sourceType: "expense", sourceId: { in: eIds } },
      });
      await prisma.expense.deleteMany({ where: { id: { in: eIds } } });
    }
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  const body = {
    category: "transport",
    amount: "500.00",
    date: "2026-08-20",
    paidFromAccount: "cash",
  };

  it("401 when unauthenticated", async () => {
    mockSession.current = null;
    expect((await postExpense(body)).status).toBe(401);
    expect((await getExpenses()).status).toBe(401);
  });

  it("403 for a non-admin role (cashier)", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect((await postExpense(body)).status).toBe(403);
    expect((await getExpenses()).status).toBe(403);
    expect((await postCorrect("whatever", { amount: "1.00" })).status).toBe(403);
  });

  it("admin can create, list and correct", async () => {
    mockSession.current = sessionFor("admin", adminId);

    const created = await postExpense(body);
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;

    const listed = await getExpenses();
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((e: { id: string }) => e.id === id)).toBe(true);

    const corrected = await postCorrect(id, { amount: "750.00" });
    expect(corrected.status).toBe(200);
    expect(corrected.body.data.amount).toBe("750.00");
  });

  it("400 on a bad category", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await postExpense({ ...body, category: "bribes" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
