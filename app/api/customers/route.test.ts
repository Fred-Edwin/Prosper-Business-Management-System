import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Role-access contract for the Customers & Credit routes (plan guardrail 6):
// admin + cashier on every customer verb; store_manager / canteen_attendant
// refused; unauthenticated → 401. `/api/money/balances` is admin-only and
// is covered in app/api/money/balances/route.test.ts.

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

const PREFIX = "__customers_route_test__";

async function listCustomers(search?: string) {
  const { GET } = await import("./route");
  const url = new URL("http://test/api/customers");
  if (search) url.searchParams.set("search", search);
  const res = await GET(new NextRequest(url));
  return { status: res.status, body: await res.json() };
}

async function createCustomer(payload: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest("http://test/api/customers", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  );
  return { status: res.status, body: await res.json() };
}

describe("/api/customers — role access", () => {
  let adminId: string;
  let cashierId: string;
  let managerId: string;

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
    const manager = await prisma.user.create({
      data: {
        name: `${PREFIX} Manager`,
        pinHash: "x",
        role: "store_manager",
        active: true,
      },
    });
    adminId = admin.id;
    cashierId = cashier.id;
    managerId = manager.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const customers = await prisma.customer.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const cids = customers.map((c) => c.id);
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.customer.deleteMany({ where: { id: { in: cids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("cashier: GET list → 200", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status } = await listCustomers(`${PREFIX}none`);
    expect(status).toBe(200);
  });

  it("cashier: POST create → 201 with the created customer", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await createCustomer({
      name: `${PREFIX} Mwangi`,
      phone: "0712345678",
    });
    expect(status).toBe(201);
    expect(body.data.name).toBe(`${PREFIX} Mwangi`);
    expect(body.data.phone).toBe("0712345678");
  });

  it("admin: GET list → 200", async () => {
    mockSession.current = sessionFor("admin", adminId);
    const { status } = await listCustomers(`${PREFIX}Mwangi`);
    expect(status).toBe(200);
  });

  it("POST validation error (empty name) → 400 field name", async () => {
    mockSession.current = sessionFor("cashier", cashierId);
    const { status, body } = await createCustomer({ name: "  ", phone: "07" });
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.field).toBe("name");
  });

  it("store_manager → 403 on GET and POST", async () => {
    mockSession.current = sessionFor("store_manager", managerId);
    expect((await listCustomers()).status).toBe(403);
    expect(
      (await createCustomer({ name: `${PREFIX}x`, phone: "07" })).status,
    ).toBe(403);
  });

  it("unauthenticated → 401", async () => {
    mockSession.current = null;
    const { status, body } = await listCustomers();
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});
