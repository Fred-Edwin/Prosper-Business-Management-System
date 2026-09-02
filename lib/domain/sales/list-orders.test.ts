import { afterAll, beforeAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "./create-order";
import { correctOrder } from "./correct-order";
import { listOrders } from "./list-orders";
import {
  cleanupSalesTestData,
  setupSalesTestData,
  type SalesTestCtx,
} from "./test-helpers";

const SCOPE = "list";

describe("listOrders", () => {
  let ctx: SalesTestCtx;

  beforeAll(async () => {
    ctx = await setupSalesTestData(SCOPE);
    const chapati = ctx.products[0];
    // Cashier A: two orders, one today, one on 2026-08-05.
    await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "1" }],
      },
      { userId: ctx.cashierId, role: "cashier", restaurantId: ctx.restaurantId },
    );
    await createOrder(
      {
        orderType: "takeaway",
        paymentMethod: "mpesa",
        occurredAt: new Date("2026-08-05T09:00:00Z"),
        lines: [{ productId: chapati.id, quantity: "2" }],
      },
      { userId: ctx.cashierId, role: "cashier", restaurantId: ctx.restaurantId },
    );
    // Cashier B: one order today.
    await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "3" }],
      },
      { userId: ctx.cashier2Id, role: "cashier", restaurantId: ctx.restaurantId },
    );
  });

  afterAll(async () => {
    await cleanupSalesTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("cashier A sees only A's orders", async () => {
    const rows = await listOrders(
      {},
      { userId: ctx.cashierId, role: "cashier" },
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.cashierId === ctx.cashierId)).toBe(true);
    expect(rows.every((r) => r.cashierName === `${ctx.prefix} Cashier A`)).toBe(true);
    expect(rows[0].lines[0].productName).toBe(ctx.products[0].name);
  });

  it("a cashierId=B filter as cashier A returns [] (no error, no leak)", async () => {
    const rows = await listOrders(
      { cashierId: ctx.cashier2Id },
      { userId: ctx.cashierId, role: "cashier" },
    );
    expect(rows).toEqual([]);
  });

  it("admin sees every cashier's orders", async () => {
    const rows = await listOrders(
      {},
      { userId: ctx.adminId, role: "admin" },
    );
    const mine = rows.filter((r) =>
      [ctx.cashierId, ctx.cashier2Id].includes(r.cashierId),
    );
    expect(mine).toHaveLength(3);
  });

  it("admin cashierId filter narrows", async () => {
    const rows = await listOrders(
      { cashierId: ctx.cashier2Id },
      { userId: ctx.adminId, role: "admin" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cashierId).toBe(ctx.cashier2Id);
  });

  it("date filter windows on the Africa/Nairobi business day", async () => {
    const rows = await listOrders(
      { date: "2026-08-05" },
      { userId: ctx.cashierId, role: "cashier" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].orderType).toBe("takeaway");
  });

  it("newest first", async () => {
    const rows = await listOrders(
      {},
      { userId: ctx.cashierId, role: "cashier" },
    );
    expect(new Date(rows[0].occurredAt).getTime()).toBeGreaterThanOrEqual(
      new Date(rows[1].occurredAt).getTime(),
    );
  });

  it("no margin / cost / buyingPrice / profit field in any row", async () => {
    const rows = await listOrders(
      {},
      { userId: ctx.adminId, role: "admin" },
    );
    expect(JSON.stringify(rows)).not.toMatch(/buyingPrice|margin|unitCost|profit/i);
  });

  // F1 (owner report + decision 2026-09-02). `correctOrder` writes the
  // correction's `total` as the FULL recomputed total, not a delta. While
  // `listOrders` returned the superseded original alongside it, every
  // consumer that summed the rows double-counted the sale: live on
  // 2026-09-01 the Cashier's Today header read "KES 380 · 2 orders" against
  // KES 120 truly collected on 1 order. The read now drops the superseded
  // original, so the naive sum every screen already does is correct.
  describe("a corrected order is not double-counted", () => {
    it("returns only the correction, and it is the correction that survives", async () => {
      const chapati = ctx.products[0];
      const original = await createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "5" }],
        },
        { userId: ctx.cashierId, role: "cashier", restaurantId: ctx.restaurantId },
      );
      const correction = await correctOrder(
        original.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "2" }],
        },
        { userId: ctx.adminId, role: "admin", restaurantId: ctx.restaurantId },
      );

      const rows = await listOrders({}, { userId: ctx.adminId, role: "admin" });
      expect(rows.find((o) => o.id === original.id)).toBeUndefined();

      const kept = rows.find((o) => o.id === correction.id);
      expect(kept).toBeDefined();
      expect(kept!.correctsOrderId).toBe(original.id);
      // The naive sum a screen does now lands on the correction's total once.
      const forThisPair = rows.filter(
        (o) => o.id === original.id || o.id === correction.id,
      );
      const sum = forThisPair.reduce((n, o) => n + Number(o.total), 0);
      expect(sum).toBeCloseTo(Number(correction.total), 2);
    });

    it("hides the superseded original from the CASHIER's own scoped read too", async () => {
      // The bug was worse for a cashier: the scoped query returned the
      // original but never the Admin's correction, so nothing on screen
      // could even tell that the order had been superseded.
      const chapati = ctx.products[0];
      const original = await createOrder(
        {
          orderType: "takeaway",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "4" }],
        },
        { userId: ctx.cashier2Id, role: "cashier", restaurantId: ctx.restaurantId },
      );
      await correctOrder(
        original.id,
        {
          orderType: "takeaway",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "1" }],
        },
        { userId: ctx.adminId, role: "admin", restaurantId: ctx.restaurantId },
      );

      const rows = await listOrders(
        {},
        { userId: ctx.cashier2Id, role: "cashier", restaurantId: ctx.restaurantId },
      );
      expect(rows.find((o) => o.id === original.id)).toBeUndefined();
    });
  });

  it("a non-order role → FORBIDDEN", async () => {
    await expect(
      listOrders({}, { userId: ctx.adminId, role: "store_manager" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
