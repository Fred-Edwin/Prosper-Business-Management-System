import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// A5 (ADR-47 §4) — POST /api/assets/:id/restore.

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

const ID = "test-restore-asset";
let locationId = "";

async function post() {
  const { POST } = await import("./route");
  const res = await POST(
    new NextRequest(`http://test/api/assets/${ID}/restore`, { method: "POST" }),
    { params: Promise.resolve({ id: ID }) },
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(async () => {
  const loc = await prisma.location.upsert({
    where: { id: "test-restore-loc" },
    update: {},
    create: { id: "test-restore-loc", name: "Restore Test Loc", type: "store" },
  });
  locationId = loc.id;
  await prisma.asset.upsert({
    where: { id: ID },
    update: { deletedAt: new Date() },
    create: {
      id: ID,
      name: "Restore Me",
      locationId,
      purchaseDate: new Date("2024-01-01"),
      purchaseCost: "5000",
      conditionStatus: "Good",
      deletedAt: new Date(),
    },
  });
  mockSession.current = sessionFor("admin");
});

afterAll(async () => {
  await prisma.asset.deleteMany({ where: { id: ID } });
  await prisma.location.deleteMany({ where: { id: "test-restore-loc" } });
  await prisma.$disconnect();
});

describe("POST /api/assets/:id/restore", () => {
  it("admin: clears deletedAt and returns { softDeleted: false }", async () => {
    const { status, body } = await post();
    expect(status).toBe(200);
    expect(body.data).toEqual({ softDeleted: false });
    const row = await prisma.asset.findUniqueOrThrow({ where: { id: ID } });
    expect(row.deletedAt).toBeNull();
  });

  it("is idempotent on an already-active asset", async () => {
    await post();
    const { status } = await post();
    expect(status).toBe(200);
  });

  it("non-admin is 403", async () => {
    mockSession.current = sessionFor("store_manager");
    const { status, body } = await post();
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
