// TEST_PLAN.md §2 flow 4 — purchase payment + receipt reconciliation, with
// the real `purchase_*` columns (ADR-46 §3). Asserts the domain/API side of
// the four-term reconciliation vocabulary end to end. The *rendering* of
// the reconciliation table is covered by `tests/screens/financials.screen.test.tsx`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { api, actAs, seedUsers } from "./helpers";

const P = "__m1_flow4__";

let adminId = "";
let smId = "";
let storeId = "";
let awaitingProductId = ""; // payment, no receipt  → "Awaiting delivery"
let receivedProductId = ""; // receipt, no payment  → "Received, no payment"

async function cleanup() {
  const movements = await prisma.stockMovement.findMany({
    where: { product: { name: { startsWith: P } } },
    select: { id: true },
  });
  const movementIds = movements.map((m) => m.id);
  if (movementIds.length > 0) {
    // M2 S4: a `purchase_payment` now writes a paired `MoneyMovement`
    // (+ its own `AuditLog` row). Clear both before the movements.
    const money = await prisma.moneyMovement.findMany({
      where: { sourceType: "purchase_payment", sourceId: { in: movementIds } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: "money_movement",
        entityId: { in: money.map((m) => m.id) },
      },
    });
    await prisma.moneyMovement.deleteMany({
      where: { sourceType: "purchase_payment", sourceId: { in: movementIds } },
    });
  }
  await prisma.stockMovement.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.productLocation.deleteMany({
    where: { product: { name: { startsWith: P } } },
  });
  await prisma.product.deleteMany({ where: { name: { startsWith: P } } });
  await prisma.location.deleteMany({ where: { name: { startsWith: P } } });
}

beforeAll(async () => {
  await cleanup();
  const u = await seedUsers();
  adminId = u.admin;
  smId = u.storeManager;
  // The seed store manager's location is the seed Store.
  const smStaff = await prisma.user.findUniqueOrThrow({
    where: { id: smId },
    include: { staff: true },
  });
  storeId = smStaff.staff!.locationId;

  const flour = await prisma.product.create({
    data: { name: `${P} Flour`, kind: "ingredient", unitLabel: "kg", buyingPrice: "50.00" },
  });
  const sugar = await prisma.product.create({
    data: { name: `${P} Sugar`, kind: "ingredient", unitLabel: "kg", buyingPrice: "80.00" },
  });
  awaitingProductId = flour.id;
  receivedProductId = sugar.id;
  for (const pid of [flour.id, sugar.id]) {
    await prisma.productLocation.create({
      data: { productId: pid, locationId: storeId, active: true, sellingPrice: "0.00" },
    });
  }
});

afterAll(async () => {
  await cleanup();
});

describe("purchase payment writes real columns and a paired money-out row", () => {
  it("a purchase_payment carries zero stock quantity, the 4 purchase_* columns, and debits the paid-from account", async () => {
    actAs({ id: adminId, role: "admin" });

    const res = await api.createMovement({
      movementType: "purchase_payment",
      productId: awaitingProductId,
      locationId: storeId,
      supplier: `${P} Mills`,
      quantity: "20",
      cost: "4000.00",
      paidFromAccount: "cash",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe("0.0000"); // ADR-39 §1 — no stock effect
    expect(res.body.data.purchaseSupplier).toBe(`${P} Mills`);
    expect(res.body.data.purchaseOrderedQty).toBe("20.0000");
    expect(res.body.data.purchaseTotalCost).toBe("4000.00");
    expect(res.body.data.purchasePaidFrom).toBe("cash");

    // M2 S4: `recordPurchasePayment` now writes ONE negative `MoneyMovement`
    // (money out of the paid-from account), `sourceType: "purchase_payment"`,
    // `sourceId` = this stock-movement id — resolving the M1 `TODO(mock)`.
    // Scoped to this payment (not a global count): the money ledger is live
    // and other suites hold rows concurrently.
    const linkedMoney = await prisma.moneyMovement.findMany({
      where: { sourceType: "purchase_payment", sourceId: res.body.data.id },
    });
    expect(linkedMoney).toHaveLength(1);
    expect(linkedMoney[0].account).toBe("cash");
    expect(linkedMoney[0].amount.toFixed(2)).toBe("-4000.00");

    // The stock balance over this product/location is unmoved (money ≠ stock).
    const bal = await api.balances(`?productIds=${awaitingProductId}&locationId=${storeId}`);
    expect(bal.status).toBe(200);
    const row = bal.body.data.find((r: any) => r.productId === awaitingProductId);
    expect(Number(row?.quantity ?? 0)).toBe(0);
  });

  it("GET /api/stock-movements returns the purchase_* fields in the row shape", async () => {
    actAs({ id: adminId, role: "admin" });
    const list = await api.listMovements(`?movementType=purchase_payment`);
    expect(list.status).toBe(200);
    const mine = list.body.data.find((m: any) => m.purchaseSupplier === `${P} Mills`);
    expect(mine).toBeTruthy();
    expect(mine.purchasePaidFrom).toBe("cash");
  });
});

describe("reconciliation vocabulary — the four terms", () => {
  it("a receipt with no linked payment shows up as unmatched (drives the 'Received, no payment' row)", async () => {
    // The store manager records a receipt with no purchasePaymentId.
    actAs({ id: smId, role: "store_manager" });
    const rec = await api.createMovement({
      movementType: "purchase_receipt",
      productId: receivedProductId,
      locationId: storeId,
      quantity: "15",
    });
    expect(rec.status).toBe(201);

    // The Admin-only outstanding endpoint the reconciliation table reads.
    actAs({ id: adminId, role: "admin" });
    const out = await api.outstanding();
    expect(out.status).toBe(200);

    const unmatched: any[] = out.body.data.unmatchedReceipts;
    const awaiting: any[] = out.body.data.awaitingReceipt;

    // The sugar receipt is an unmatched receipt → "Received, no payment".
    expect(unmatched.some((r) => r.productId === receivedProductId)).toBe(true);
    // The flour payment is awaiting a delivery → "Awaiting delivery".
    expect(awaiting.some((r) => r.productId === awaitingProductId)).toBe(true);
    // And the flour payment is NOT also in unmatchedReceipts.
    expect(unmatched.some((r) => r.productId === awaitingProductId)).toBe(false);
  });

  it("the outstanding endpoint is location-scoped for a store manager (M2 §3.4: 200, own location only)", async () => {
    // Widened in M2 batch-movements: a Store Manager sees deliveries
    // awaiting receipt AT THEIR OWN location for the Receive "match a
    // paid delivery" picker. Admin still sees every location.
    actAs({ id: smId, role: "store_manager" });
    const out = await api.outstanding();
    expect(out.status).toBe(200);
    for (const r of out.body.data.awaitingReceipt) {
      expect(r.locationId).toBe(storeId);
    }
    for (const r of out.body.data.unmatchedReceipts) {
      expect(r.locationId).toBe(storeId);
    }
  });
});
