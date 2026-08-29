// Session 17 QA — regression cover for finding F-1 (LEDGER INTEGRITY, High).
// See `docs/sprints/session-17-findings.md`.
//
// Before the fix, `correctMovement` computed `delta = corrected −
// ORIGINAL.quantity` (never the current derived value) and had no guard
// against correcting a row that is itself a correction. That let:
//
//   1. a repeated / double-submitted correction stack a SECOND identical
//      delta row and move the balance AGAIN (both calls returned 201);
//   2. a correction (delta) row be corrected in turn → unbounded chains.
//
// Fixed in `lib/domain/stock/correct-movement.ts`: `delta` is measured
// against `original.quantity + Σ(existing deltas)`, and a row whose
// `correctsMovementId` is set is rejected. These tests assert that fix.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { api, actAs, seedUsers, SEED_LOCATIONS } from "./helpers";

const P = "__m1_finding_corr__";

let adminId = "";
let storeId = "";
let productId = "";
let movementId = "";

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
    data: { name: `${P} Grain`, kind: "ingredient", unitLabel: "kg", buyingPrice: "10.00" },
  });
  productId = p.id;
  await prisma.productLocation.create({
    data: { productId, locationId: storeId, active: true, sellingPrice: "0.00" },
  });
  const m = await prisma.stockMovement.create({
    data: {
      productId,
      locationId: storeId,
      movementType: "purchase_receipt",
      quantity: "30",
      recordedById: adminId,
      occurredAt: new Date(),
    },
  });
  movementId = m.id;
});

afterAll(async () => {
  await cleanup();
});

describe("F-1 regression — correction stacking / chaining is rejected", () => {
  it("re-POSTing an identical correction must not stack a second delta row", async () => {
    actAs({ id: adminId, role: "admin" });

    const c1 = await api.correctMovement(movementId, { correctedQuantity: "18" });
    expect(c1.status).toBe(201);
    expect(c1.body.data.quantity).toBe("-12.0000");

    // The current derived value is already 18 → a repeat is a no-op and must
    // be rejected (or at minimum not create a second delta row).
    const c2 = await api.correctMovement(movementId, { correctedQuantity: "18" });
    expect(
      c2.status,
      "a repeated identical correction should be VALIDATION_ERROR, not another 201",
    ).toBe(400);

    const deltas = await prisma.stockMovement.count({
      where: { correctsMovementId: movementId },
    });
    expect(deltas, "exactly one delta row should exist").toBe(1);
  });

  it("a correction (delta) row cannot itself be corrected", async () => {
    actAs({ id: adminId, role: "admin" });
    const delta = await prisma.stockMovement.findFirstOrThrow({
      where: { correctsMovementId: movementId },
    });
    const res = await api.correctMovement(delta.id, { correctedQuantity: "0" });
    expect(
      res.status,
      "correcting a delta row should be rejected — corrections don't chain",
    ).toBe(400);
  });
});
