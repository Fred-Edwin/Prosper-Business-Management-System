// TEST_PLAN.md §2 flow 7 — the hard-delete friction guard, end to end
// (F1 Product + F3 Asset). ADR-23: exact confirmName or VALIDATION_ERROR;
// 409 CONFLICT when linked history exists; clean → deleted. The delete is
// initiated from inside the Edit drawer in the UI (ADR-46 §5) — the widget
// behaviour is covered by `tests/screens/catalog.screen.test.tsx`; this
// asserts the route contract behind it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { api, actAs, seedUsers, SEED_LOCATIONS } from "./helpers";

const P = "__m1_flow7__";

let adminId = "";
let storeId = "";

async function cleanup() {
  await prisma.stockMovement.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.auditLog.deleteMany({
    where: { entityType: "asset", entityId: { in: (
      await prisma.asset.findMany({ where: { name: { startsWith: P } }, select: { id: true } })
    ).map((a) => a.id) } },
  });
  await prisma.productLocation.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.product.deleteMany({ where: { name: { startsWith: P } } });
  await prisma.asset.deleteMany({ where: { name: { startsWith: P } } });
}

beforeAll(async () => {
  await cleanup();
  const u = await seedUsers();
  adminId = u.admin;
  storeId = SEED_LOCATIONS.store;
});

afterAll(async () => {
  await cleanup();
});

describe("product hard-delete guard", () => {
  it("wrong confirmName → 400; a linked stock movement → 409; a clean product → deleted", async () => {
    actAs({ id: adminId, role: "admin" });

    // Linked: has a stock movement.
    const linked = await prisma.product.create({
      data: { name: `${P} Linked`, kind: "ingredient", unitLabel: "kg", buyingPrice: "10.00" },
    });
    await prisma.productLocation.create({
      data: { productId: linked.id, locationId: storeId, active: true, sellingPrice: "0.00" },
    });
    await prisma.stockMovement.create({
      data: {
        productId: linked.id,
        locationId: storeId,
        movementType: "opening",
        quantity: "5",
        recordedById: adminId,
        occurredAt: new Date(),
      },
    });

    expect((await api.hardDeleteProduct(linked.id, "not the name")).status).toBe(400);

    const blocked = await api.hardDeleteProduct(linked.id, `${P} Linked`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("CONFLICT");

    // Clean product → deletes.
    const clean = await prisma.product.create({
      data: { name: `${P} Clean`, kind: "goods", unitLabel: "ea", buyingPrice: "1.00" },
    });
    const ok = await api.hardDeleteProduct(clean.id, `${P} Clean`);
    expect(ok.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: clean.id } })).toBeNull();
  });
});

describe("asset hard-delete guard", () => {
  it("wrong confirmName → 400; an audit-log reference → 409; a clean asset → deleted", async () => {
    actAs({ id: adminId, role: "admin" });

    const logged = await prisma.asset.create({
      data: {
        name: `${P} Logged Rig`,
        locationId: storeId,
        purchaseDate: new Date("2026-01-01"),
        purchaseCost: "5000.00",
        conditionStatus: "Good",
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "correct",
        entityType: "asset",
        entityId: logged.id,
        occurredAt: new Date(),
      },
    });

    expect((await api.hardDeleteAsset(logged.id, "nope")).status).toBe(400);

    const blocked = await api.hardDeleteAsset(logged.id, `${P} Logged Rig`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("CONFLICT");

    const clean = await prisma.asset.create({
      data: {
        name: `${P} Clean Rig`,
        locationId: storeId,
        purchaseDate: new Date("2026-01-01"),
        purchaseCost: "100.00",
        conditionStatus: "Good",
      },
    });
    const ok = await api.hardDeleteAsset(clean.id, `${P} Clean Rig`);
    expect(ok.status).toBe(200);
    expect(await prisma.asset.findUnique({ where: { id: clean.id } })).toBeNull();
  });
});
