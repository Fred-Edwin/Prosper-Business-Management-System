import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Role gates only for POST /api/pay/payout (single + ?mode=all). The payout
// math, the no-double-count guarantee, the CONFLICT / future-month /
// closed-day / zero-net guards are covered by the staff domain suite
// (lib/domain/staff/payout.test.ts).

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

const PREFIX = "__pay_payout_route_test__";

async function postPayout(payload: unknown, all = false) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest(
      `http://test/api/pay/payout${all ? "?mode=all" : ""}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      },
    ),
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/pay/payout role gates", () => {
  let adminId: string;
  let cashierId: string;
  let staffId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    const cashier = await prisma.user.create({
      data: { name: `${PREFIX} Cashier`, pinHash: "x", role: "cashier", active: true },
    });
    const loc = await prisma.location.create({
      data: { name: `${PREFIX} Loc`, type: "restaurant" },
    });
    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Worker`,
        role: "cashier",
        locationId: loc.id,
        dailyRate: "500.00",
      },
    });
    adminId = admin.id;
    cashierId = cashier.id;
    staffId = staff.id;
  });

  afterAll(async () => {
    const payouts = await prisma.staffPayout.findMany({
      where: { staffId },
      select: { id: true, expenseId: true },
    });
    const eids = payouts.map((p) => p.expenseId);
    await prisma.staffPayout.deleteMany({ where: { staffId } });
    if (eids.length) {
      await prisma.moneyMovement.deleteMany({
        where: { sourceType: "expense", sourceId: { in: eids } },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: "expense", entityId: { in: eids } },
      });
      await prisma.expense.deleteMany({ where: { id: { in: eids } } });
    }
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
    await prisma.staff.deleteMany({ where: { id: staffId } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  const single = { staffId: "", month: "2026-01", paidFromAccount: "cash", date: "2026-02-01" };
  const all = { month: "2026-01", paidFromAccount: "cash", date: "2026-02-01" };

  it("401 when unauthenticated", async () => {
    mockSession.current = null;
    expect((await postPayout(single)).status).toBe(401);
    expect((await postPayout(all, true)).status).toBe(401);
  });

  it("403 for a non-admin role (cashier)", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect((await postPayout(single)).status).toBe(403);
    expect((await postPayout(all, true)).status).toBe(403);
  });

  it("400 on a malformed body (admin)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await postPayout({ month: "nope", paidFromAccount: "cash", date: "2026-02-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("admin can record a single payout through the route (201)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const res = await postPayout({ ...single, staffId });
    expect(res.status).toBe(201);
    expect(res.body.data.paid).toBe(true);
    expect(res.body.data.payout.netPaid).toBe(res.body.data.netPay);
  });

  // NOTE: `?mode=all` is business-wide (pays every unpaid active staff in
  // the shared dev DB) — its happy path is exercised in the domain suite,
  // not here. Only its role gates are checked above.
});
