import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Regression guard for Session 14 / D1: the staff stock hooks
// (`useStaffStock`, `useStockLevels`) fetch `GET /api/products` and
// `GET /api/locations` for the flow product pickers and the mobile
// stock-levels views. Both routes were `admin`-only, so every
// `store_manager` / `canteen_attendant` stock screen 403'd on load.
// The fix widened the GET guard to the two staff roles while keeping
// `buyingPrice` stripped for non-admin (list-products.ts) and POST
// admin-only.

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

async function getProducts() {
  const { GET } = await import("./route");
  const res = await GET(new NextRequest("http://test/api/products"));
  return { status: res.status, body: await res.json() };
}

describe("GET /api/products — role access (D1 regression)", () => {
  beforeAll(async () => {
    await prisma.product.upsert({
      where: { id: "test-d1-product" },
      update: { buyingPrice: "123.45", deletedAt: null },
      create: {
        id: "test-d1-product",
        name: "D1 Regression Widget",
        kind: "ingredient",
        buyingPrice: "123.45",
        unitLabel: "unit",
      },
    });
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: "test-d1-product" } });
    await prisma.$disconnect();
  });

  it("admin gets 200 with buyingPrice present", async () => {
    mockSession.current = sessionFor("admin");
    const { status, body } = await getProducts();
    expect(status).toBe(200);
    const row = body.data.find(
      (p: { id: string }) => p.id === "test-d1-product",
    );
    expect(row.buyingPrice).toBe("123.45");
  });

  it("store_manager gets 200 (not 403) with buyingPrice stripped to null", async () => {
    mockSession.current = sessionFor("store_manager");
    const { status, body } = await getProducts();
    expect(status).toBe(200);
    const row = body.data.find(
      (p: { id: string }) => p.id === "test-d1-product",
    );
    expect(row.buyingPrice).toBeNull();
  });

  it("canteen_attendant gets 200 (not 403)", async () => {
    mockSession.current = sessionFor("canteen_attendant");
    const { status } = await getProducts();
    expect(status).toBe(200);
  });

  it("cashier gets 200 (M2: C2 New-Order grid) with buyingPrice stripped to null", async () => {
    // M2 Session 6 (owner-approved): the Cashier's C2 product grid needs
    // the catalogue read. `listProducts` still strips buyingPrice for any
    // non-admin, so no margin leaks (plan §3.6).
    mockSession.current = sessionFor("cashier");
    const { status, body } = await getProducts();
    expect(status).toBe(200);
    const row = body.data.find(
      (p: { id: string }) => p.id === "test-d1-product",
    );
    expect(row.buyingPrice).toBeNull();
  });

  it("an inactive staff session is 401", async () => {
    mockSession.current = sessionFor("store_manager", false);
    const { status, body } = await getProducts();
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});
