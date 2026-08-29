// TEST_PLAN.md §2 flow 5 — day close → lock → correction path (F2).
// A movement dated to a closed day is correctable by admin only, always as
// an additive delta row; the original is never mutated; the derived balance
// reflects original + delta (ADR-15 / ADR-39 §3).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import { api, actAs, seedUsers } from "./helpers";

const P = "__m1_flow5__";
const CLOSED_DATE = "2026-05-12";

let adminId = "";
let smId = "";
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
  await prisma.dayClose.deleteMany({ where: { closedBy: { startsWith: P } } });
}

beforeAll(async () => {
  await cleanup();
  const u = await seedUsers();
  adminId = u.admin;
  smId = u.storeManager;
  const smStaff = await prisma.user.findUniqueOrThrow({
    where: { id: smId },
    include: { staff: true },
  });
  storeId = smStaff.staff!.locationId;

  const p = await prisma.product.create({
    data: { name: `${P} Sack`, kind: "ingredient", unitLabel: "kg", buyingPrice: "50.00" },
  });
  productId = p.id;
  await prisma.productLocation.create({
    data: { productId, locationId: storeId, active: true, sellingPrice: "0.00" },
  });

  // A +40 receipt forced onto the historical date, then close that day.
  const m = await prisma.stockMovement.create({
    data: {
      productId,
      locationId: storeId,
      movementType: "purchase_receipt",
      quantity: "40",
      recordedById: adminId,
      occurredAt: new Date(`${CLOSED_DATE}T09:00:00+03:00`),
    },
  });
  movementId = m.id;
  await prisma.dayClose.create({
    data: { date: businessDateOnly(CLOSED_DATE), closedBy: `${P} closer` },
  });
});

afterAll(async () => {
  await cleanup();
});

describe("day-close gates who may correct", () => {
  it("a non-admin cannot correct a movement on a closed day", async () => {
    actAs({ id: smId, role: "store_manager" });
    const res = await api.correctMovement(movementId, { correctedQuantity: "35" });
    expect(res.status).toBe(403);
  });

  it("admin correction on a closed day: additive delta, original untouched, balance follows the delta", async () => {
    actAs({ id: adminId, role: "admin" });

    const before = await api.balances(`?productIds=${productId}&locationId=${storeId}`);
    const beforeQty = Number(before.body.data.find((r: any) => r.productId === productId)?.quantity ?? 0);

    // +40 corrected to +35 → delta -5.
    const res = await api.correctMovement(movementId, { correctedQuantity: "35" });
    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe("-5.0000");
    expect(res.body.data.correctsMovementId).toBe(movementId);

    // Original row is byte-identical.
    const original = await prisma.stockMovement.findUniqueOrThrow({ where: { id: movementId } });
    expect(original.quantity.toString()).toBe("40");
    expect(original.correctsMovementId).toBeNull();

    // The delta row shares the original's occurredAt (same business day).
    const delta = await prisma.stockMovement.findFirstOrThrow({
      where: { correctsMovementId: movementId },
    });
    expect(delta.occurredAt.toISOString()).toBe(original.occurredAt.toISOString());

    // Derived balance moved by exactly the delta.
    const after = await api.balances(`?productIds=${productId}&locationId=${storeId}`);
    const afterQty = Number(after.body.data.find((r: any) => r.productId === productId)?.quantity ?? 0);
    expect(afterQty).toBeCloseTo(beforeQty - 5, 4);
  });

  it("a sign-flip correction computes the delta with the right sign", async () => {
    // Fresh movement: an issue of -10, corrected to +3 → delta +13.
    actAs({ id: adminId, role: "admin" });
    const issue = await prisma.stockMovement.create({
      data: {
        productId,
        locationId: storeId,
        movementType: "issue",
        quantity: "-10",
        recordedById: adminId,
        occurredAt: new Date(`${CLOSED_DATE}T10:00:00+03:00`),
      },
    });
    const res = await api.correctMovement(issue.id, { correctedQuantity: "3" });
    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe("13.0000");
  });

  it("a zero-delta correction is rejected (measured against the current derived value, not the original)", async () => {
    actAs({ id: adminId, role: "admin" });
    // Earlier in this file the movement was corrected +40 → +35. Re-submitting
    // "35" is now a no-op and must be rejected — and "40" (the original) is
    // NOT a no-op any more, it's a +5 delta. Session 17 F-1.
    const noop = await api.correctMovement(movementId, { correctedQuantity: "35" });
    expect(noop.status).toBe(400);
    expect(noop.body.error.code).toBe("VALIDATION_ERROR");
  });
});
