import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  listOutstandingPurchases,
  listOutstandingPurchasesForLocation,
} from "./list-movements";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "listoutdest";

/**
 * Session 16 / ADR-69 — `listOutstandingPurchasesForLocation` takes a LIST
 * of destination locations, because receiving is by destination, not by
 * the receiver's home location.
 *
 * The bug: ADR-67 lands `goods` deliveries at the Restaurant (goods may
 * not sit at the Store), but this read was hard-scoped to the caller's
 * single assigned location. The Store Manager is assigned to the Store,
 * so a Restaurant-destined delivery was invisible to the one person
 * expected to receive it — and ADR-67 had already widened the WRITE path
 * to let them post that receipt. A Restaurant- or Canteen-destined
 * purchase was a dead end.
 *
 * The role → destinations map itself lives at the route (SM → Store +
 * Restaurant, attendant → Canteen); these cases lock in the filter the
 * route relies on.
 */
describe("listOutstandingPurchasesForLocation — destination list (ADR-69)", () => {
  let ctx: StockTestCtx;
  let paymentAtStore: string;
  let paymentAtRestaurant: string;
  let paymentAtCanteen: string;
  let paymentAlreadyReceived: string;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);

    const payment = async (locationId: string, productId: string, at: string) =>
      (
        await prisma.stockMovement.create({
          data: {
            productId,
            locationId,
            movementType: "purchase_payment",
            quantity: new Prisma.Decimal("0"),
            recordedById: ctx.adminId,
            occurredAt: new Date(at),
            purchaseSupplier: `${ctx.prefix} Supplier`,
            purchaseOrderedQty: new Prisma.Decimal("12"),
            purchaseTotalCost: new Prisma.Decimal("1200"),
            purchasePaidFrom: "cash",
          },
        })
      ).id;

    // One awaiting-receipt payment per location, so a scope leak is visible.
    paymentAtStore = await payment(
      ctx.locationIds.store,
      ctx.productId,
      "2026-08-05T06:00:00Z",
    );
    paymentAtRestaurant = await payment(
      ctx.locationIds.restaurant,
      ctx.goodsProductId,
      "2026-08-05T07:00:00Z",
    );
    paymentAtCanteen = await payment(
      ctx.locationIds.canteen,
      ctx.goodsProductId,
      "2026-08-05T08:00:00Z",
    );

    // A fourth payment that HAS been received — must never show up
    // (existing behaviour: a linked `purchase_receipt` clears it).
    paymentAlreadyReceived = await payment(
      ctx.locationIds.restaurant,
      ctx.goodsProductId,
      "2026-08-05T09:00:00Z",
    );
    await prisma.stockMovement.create({
      data: {
        productId: ctx.goodsProductId,
        locationId: ctx.locationIds.restaurant,
        movementType: "purchase_receipt",
        quantity: new Prisma.Decimal("12"),
        recordedById: ctx.recorderId,
        occurredAt: new Date("2026-08-05T10:00:00Z"),
        purchasePaymentId: paymentAlreadyReceived,
      },
    });
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
  });

  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it("a multi-location filter returns payments from BOTH locations", async () => {
    // The Store Manager's scope: Store + Restaurant. THE BUG — the
    // Restaurant-destined row was previously invisible to them.
    const out = await listOutstandingPurchasesForLocation([
      ctx.locationIds.store,
      ctx.locationIds.restaurant,
    ]);
    expect(ids(out.awaitingReceipt)).toContain(paymentAtStore);
    expect(ids(out.awaitingReceipt)).toContain(paymentAtRestaurant);
    expect(ids(out.awaitingReceipt)).not.toContain(paymentAtCanteen);
  });

  it("a Canteen-only filter excludes the Store's and the Restaurant's", async () => {
    const out = await listOutstandingPurchasesForLocation([
      ctx.locationIds.canteen,
    ]);
    expect(ids(out.awaitingReceipt)).toContain(paymentAtCanteen);
    expect(ids(out.awaitingReceipt)).not.toContain(paymentAtStore);
    expect(ids(out.awaitingReceipt)).not.toContain(paymentAtRestaurant);
  });

  it("a bare string is still accepted and scopes to that one location", async () => {
    const out = await listOutstandingPurchasesForLocation(
      ctx.locationIds.store,
    );
    expect(ids(out.awaitingReceipt)).toContain(paymentAtStore);
    expect(ids(out.awaitingReceipt)).not.toContain(paymentAtRestaurant);
  });

  it("the unfiltered Admin read still sees every location", async () => {
    const out = await listOutstandingPurchases();
    expect(ids(out.awaitingReceipt)).toEqual(
      expect.arrayContaining([
        paymentAtStore,
        paymentAtRestaurant,
        paymentAtCanteen,
      ]),
    );
  });

  it("a payment already linked to a receipt is excluded (unchanged)", async () => {
    const scoped = await listOutstandingPurchasesForLocation([
      ctx.locationIds.store,
      ctx.locationIds.restaurant,
    ]);
    expect(ids(scoped.awaitingReceipt)).not.toContain(paymentAlreadyReceived);
    const all = await listOutstandingPurchases();
    expect(ids(all.awaitingReceipt)).not.toContain(paymentAlreadyReceived);
  });
});
