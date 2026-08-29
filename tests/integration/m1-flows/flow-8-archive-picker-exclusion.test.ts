// New M1 flow (ADR-47): archive → picker exclusion → unarchive, end to end.
// `tests/integration/archived-picker-exclusion.test.ts` already asserts the
// picker LIST omits archived rows; this file adds the *smuggle* attacks —
// a deep-linked archived productId in a movement POST must NOT_FOUND — plus
// the unarchive round-trip and the ADR-38 ProductLocation rule.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { api, actAs, seedUsers, SEED_LOCATIONS } from "./helpers";

const P = "__m1_flow8__";

let adminId = "";
let storeId = "";
let productId = "";

async function cleanup() {
  await prisma.stockMovement.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.productLocation.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.product.deleteMany({ where: { name: { startsWith: P } } });
}

beforeAll(async () => {
  await cleanup();
  const u = await seedUsers();
  adminId = u.admin;
  storeId = SEED_LOCATIONS.store;
  const p = await prisma.product.create({
    data: { name: `${P} Rare Spice`, kind: "ingredient", unitLabel: "kg", buyingPrice: "20.00" },
  });
  productId = p.id;
  await prisma.productLocation.create({
    data: { productId, locationId: storeId, active: true, sellingPrice: "0.00" },
  });
});

afterAll(async () => {
  await cleanup();
});

describe("archive → exclusion → unarchive", () => {
  it("active → offered by the picker source; archived → gone; unarchived → back", async () => {
    actAs({ id: adminId, role: "admin" });

    let list = await api.listProducts();
    expect(list.body.data.some((p: any) => p.id === productId)).toBe(true);

    expect((await api.archiveProduct(productId)).status).toBe(200);

    list = await api.listProducts();
    expect(list.body.data.some((p: any) => p.id === productId)).toBe(false);

    expect((await api.unarchiveProduct(productId)).status).toBe(200);
    list = await api.listProducts();
    expect(list.body.data.some((p: any) => p.id === productId)).toBe(true);
  });

  it("an archived product cannot be smuggled into a movement by a deep-linked productId", async () => {
    actAs({ id: adminId, role: "admin" });
    await api.archiveProduct(productId);

    // opening + purchase_payment are admin-writable; both must NOT_FOUND a
    // soft-deleted product via the domain `assertProductExists` guard.
    const opening = await api.createMovement({
      movementType: "opening",
      productId,
      locationId: storeId,
      businessDate: "2026-08-29",
      quantity: "5",
    });
    expect(opening.status).toBe(404);
    expect(opening.body.error.code).toBe("NOT_FOUND");

    const payment = await api.createMovement({
      movementType: "purchase_payment",
      productId,
      locationId: storeId,
      supplier: "X",
      quantity: "5",
      cost: "100.00",
      paidFromAccount: "cash",
    });
    expect(payment.status).toBe(404);
    expect(payment.body.error.code).toBe("NOT_FOUND");

    await api.unarchiveProduct(productId); // leave it active for the next test
  });

  it("unarchive does NOT reactivate ProductLocation rows (ADR-38)", async () => {
    actAs({ id: adminId, role: "admin" });

    // make sure it's enabled, then archive + unarchive
    await prisma.productLocation.updateMany({
      where: { productId, locationId: storeId },
      data: { active: true },
    });
    await api.archiveProduct(productId);
    await api.unarchiveProduct(productId);

    const pl = await prisma.productLocation.findFirstOrThrow({
      where: { productId, locationId: storeId },
    });
    expect(pl.active).toBe(false);
  });
});
