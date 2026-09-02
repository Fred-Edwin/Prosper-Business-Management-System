import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Role gates only: POST /api/handovers/:id/receive is Admin-only;
// POST /api/handovers/:id/correct is Admin-only; PATCH /api/handovers/:id
// is staff-only.

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

const PREFIX = "__handovers_receive_route_test__";

async function postReceive(id: string, payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest(`http://test/api/handovers/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

async function postCorrect(id: string, payload: unknown) {
  const { POST } = await import("../correct/route");
  const res = await POST(
    new NextRequest(`http://test/api/handovers/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

async function patchHandover(id: string, payload: unknown) {
  const { PATCH } = await import("../route");
  const res = await PATCH(
    new NextRequest(`http://test/api/handovers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/handovers/:id/{receive,correct} + PATCH role gates", () => {
  let adminId: string;
  let cashierId: string;
  let cashier2Id: string;
  let handoverId: string;

  beforeAll(async () => {
    const location = await prisma.location.create({
      data: { name: `${PREFIX} Restaurant`, type: "restaurant", active: true },
    });
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    const mkCashier = async (name: string) => {
      const staff = await prisma.staff.create({
        data: {
          name: `${PREFIX} ${name}`,
          role: "cashier",
          locationId: location.id,
          dailyRate: new Prisma.Decimal("0"),
          active: true,
        },
      });
      const user = await prisma.user.create({
        data: {
          name: `${PREFIX} ${name}`,
          pinHash: "x",
          role: "cashier",
          active: true,
          staffId: staff.id,
        },
      });
      return { userId: user.id, staffId: staff.id };
    };
    const c1 = await mkCashier("Cashier A");
    const c2 = await mkCashier("Cashier B");
    adminId = admin.id;
    cashierId = c1.userId;
    cashier2Id = c2.userId;

    const handover = await prisma.handover.create({
      data: {
        staffId: c1.staffId,
        locationId: location.id,
        cashDeclared: "1000.00",
        mpesaDeclared: "0.00",
        occurredAt: new Date(),
      },
    });
    handoverId = handover.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const uids = users.map((u) => u.id);
    const receipts = await prisma.receiptOfHandover.findMany({
      where: { handoverId },
      select: { id: true },
    });
    await prisma.handoverShortfall.deleteMany({
      where: { receiptOfHandoverId: { in: receipts.map((r) => r.id) } },
    });
    await prisma.receiptOfHandover.deleteMany({ where: { handoverId } });
    await prisma.handover.updateMany({
      where: { location: { name: { startsWith: PREFIX } } },
      data: { correctsHandoverId: null },
    });
    await prisma.handover.deleteMany({
      where: { location: { name: { startsWith: PREFIX } } },
    });
    await prisma.auditLog.deleteMany({ where: { userId: { in: uids } } });
    await prisma.user.deleteMany({ where: { id: { in: uids } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("POST receive: cashier → 403", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect(
      (await postReceive(handoverId, { cashReceived: "1000.00", mpesaReceived: "0.00" }))
        .status,
    ).toBe(403);
  });

  it("POST receive: unauthenticated → 401", async () => {
    mockSession.current = null;
    expect(
      (await postReceive(handoverId, { cashReceived: "1000.00", mpesaReceived: "0.00" }))
        .status,
    ).toBe(401);
  });

  it("POST receive: admin → 201", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status, body } = await postReceive(handoverId, {
      cashReceived: "1000.00",
      mpesaReceived: "0.00",
    });
    expect(status).toBe(201);
    expect(body.data.receipts[0].cashVariance).toBe("0.00");
  });

  it("POST correct: cashier → 403", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    expect(
      (
        await postCorrect(handoverId, {
          target: "handover",
          cashDeclared: "900.00",
          mpesaDeclared: "0.00",
        })
      ).status,
    ).toBe(403);
  });

  it("POST correct: admin → 201", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status } = await postCorrect(handoverId, {
      target: "handover",
      cashDeclared: "950.00",
      mpesaDeclared: "0.00",
    });
    expect(status).toBe(201);
  });

  it("PATCH: admin → 403 (edit-own is staff-only)", async () => {
    mockSession.current = sessionFor("admin", adminId);
    expect(
      (await patchHandover(handoverId, { cashDeclared: "1", mpesaDeclared: "0" }))
        .status,
    ).toBe(403);
  });

  it("PATCH: another cashier → 403 (ownership enforced in domain)", async () => {
    mockSession.current = sessionFor("cashier", cashier2Id);
    const { status } = await patchHandover(handoverId, {
      cashDeclared: "1.00",
      mpesaDeclared: "0.00",
    });
    expect(status).toBe(403);
  });
});
