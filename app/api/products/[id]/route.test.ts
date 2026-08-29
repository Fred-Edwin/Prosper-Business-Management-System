import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// A5 (ADR-47 §4) — POST /api/products/:id?mode=unarchive.

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

const ID = "test-unarchive-product";

async function post(query: string) {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest(`http://test/api/products/${ID}${query}`, { method: "POST" }),
    { params: Promise.resolve({ id: ID }) },
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(async () => {
  await prisma.product.upsert({
    where: { id: ID },
    update: { deletedAt: new Date() },
    create: {
      id: ID,
      name: "Unarchive Me",
      kind: "ingredient",
      buyingPrice: "10.00",
      unitLabel: "unit",
      deletedAt: new Date(),
    },
  });
  mockSession.current = sessionFor("admin");
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: ID } });
  await prisma.$disconnect();
});

describe("POST /api/products/:id?mode=unarchive", () => {
  it("admin: clears deletedAt and returns { archived: false }", async () => {
    const { status, body } = await post("?mode=unarchive");
    expect(status).toBe(200);
    expect(body.data).toEqual({ archived: false });
    const row = await prisma.product.findUniqueOrThrow({ where: { id: ID } });
    expect(row.deletedAt).toBeNull();
  });

  it("is idempotent — a second call on an already-active product still 200s", async () => {
    await post("?mode=unarchive");
    const { status, body } = await post("?mode=unarchive");
    expect(status).toBe(200);
    expect(body.data).toEqual({ archived: false });
  });

  it("rejects a missing / wrong mode with VALIDATION_ERROR", async () => {
    const { status, body } = await post("");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("non-admin is 403", async () => {
    mockSession.current = sessionFor("store_manager");
    const { status, body } = await post("?mode=unarchive");
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
