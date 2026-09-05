import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Role gate, body validation and the wire shape. The pinning / correction
// behaviour is covered by lib/domain/financials/opening-balance.test.ts.

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

const PREFIX = "__fin_opening_route_test__";

async function get() {
  const { GET } = await import("./route");
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

async function put(body: unknown) {
  const { PUT } = await import("./route");
  const res = await PUT(
    new NextRequest("http://test/api/financials/opening-balance", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

/** `opening_balance` rows are global (ADR-70) — clear between tests. */
async function clearOpeningRows() {
  const rows = await prisma.moneyMovement.findMany({
    where: { sourceType: "opening_balance" },
    select: { id: true },
  });
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.id);
  await prisma.moneyMovement.updateMany({
    where: { id: { in: ids } },
    data: { correctsMovementId: null },
  });
  await prisma.moneyMovement.deleteMany({ where: { id: { in: ids } } });
}

describe("/api/financials/opening-balance", () => {
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

  afterEach(async () => {
    await clearOpeningRows();
  });

  afterAll(async () => {
    await clearOpeningRows();
    await prisma.auditLog.deleteMany({
      where: { user: { name: { startsWith: PREFIX } } },
    });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("401 unauthenticated, 403 non-admin — both verbs", async () => {
    mockSession.current = null;
    expect((await get()).status).toBe(401);
    expect((await put({ account: "cash", amount: "1" })).status).toBe(401);

    mockSession.current = sessionFor("cashier", cashierId);
    expect((await get()).status).toBe(403);
    expect((await put({ account: "cash", amount: "1" })).status).toBe(403);
  });

  it("GET returns both accounts unset on a virgin ledger", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body.data.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.data.accounts).toHaveLength(2);
    for (const a of body.data.accounts) {
      expect(a.set).toBe(false);
      expect(a.amount).toBe("0.00");
    }
  });

  it("PUT stores a figure, and GET reads it back", async () => {
    mockSession.current = sessionFor("admin", adminId);

    const put1 = await put({ account: "cash", amount: "40000" });
    expect(put1.status).toBe(200);
    expect(put1.body.data.amount).toBe("40000.00");
    expect(put1.body.data.corrected).toBe(false);

    const { body } = await get();
    const cash = body.data.accounts.find(
      (a: { account: string }) => a.account === "cash",
    );
    expect(cash.amount).toBe("40000.00");
    expect(cash.set).toBe(true);
  });

  it("PUT a second time is a correction, not a second opening", async () => {
    mockSession.current = sessionFor("admin", adminId);
    await put({ account: "cash", amount: "40000" });
    const again = await put({ account: "cash", amount: "45000" });

    expect(again.body.data.corrected).toBe(true);
    expect(again.body.data.amount).toBe("45000.00");
    expect(again.body.data.delta).toBe("5000.00");

    const rows = await prisma.moneyMovement.findMany({
      where: { sourceType: "opening_balance" },
    });
    expect(rows).toHaveLength(2);
  });

  it("accepts a negative amount (an overdrawn M-Pesa/Bank opening)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await put({ account: "mpesa_bank", amount: "-250.75" });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe("-250.75");
  });

  it("400s on a bad body", async () => {
    mockSession.current = sessionFor("admin", adminId);

    expect((await put("not json")).status).toBe(400);
    expect((await put({ account: "wallet", amount: "1" })).status).toBe(400);
    expect((await put({ account: "cash", amount: "abc" })).status).toBe(400);
    expect((await put({ account: "cash", amount: "1.234" })).status).toBe(400);
    expect((await put({ account: "cash" })).status).toBe(400);
  });

  it("ignores a client-supplied date — the day is pinned server-side", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await put({
      account: "cash",
      amount: "40000",
      businessDate: "2019-01-01",
    });
    expect(res.status).toBe(200);
    // Not 2019: the row sits on the pinned day, i.e. today.
    expect(res.body.data.businessDate).not.toBe("2019-01-01");
  });
});
