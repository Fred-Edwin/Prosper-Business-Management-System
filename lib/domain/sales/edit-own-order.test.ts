import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { createOrder } from "./create-order";
import { editOwnOrder } from "./edit-own-order";
import {
  cleanupSalesTestData,
  setupSalesTestData,
  type SalesTestCtx,
} from "./test-helpers";

const SCOPE = "edit";

describe("editOwnOrder", () => {
  let ctx: SalesTestCtx;
  let cashierA: { userId: string; role: "cashier"; restaurantId: string };

  beforeEach(async () => {
    ctx = await setupSalesTestData(SCOPE);
    cashierA = {
      userId: ctx.cashierId,
      role: "cashier",
      restaurantId: ctx.restaurantId,
    };
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function balanceOf(productId: string) {
    return (
      await getDerivedStockBalance({ productId, locationId: ctx.restaurantId })
    ).quantity;
  }

  it("own same-day order: changing a line qty rewrites lines + sale movements + money effect; total + balance reflect the new qty", async () => {
    const [chapati] = ctx.products; // opening 100, price 20

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "5" }],
      },
      cashierA,
    );
    expect(order.total).toBe("100.00");
    expect(await balanceOf(chapati.id)).toBe("95.0000");

    const edited = await editOwnOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "2" }],
      },
      cashierA,
    );

    expect(edited.id).toBe(order.id);
    expect(edited.total).toBe("40.00");
    expect(edited.cashierName).toBe(`${ctx.prefix} Cashier A`);
    expect(edited.lines).toHaveLength(1);
    expect(edited.lines[0].productName).toBe(chapati.name);
    expect(edited.lines[0].quantity).toBe("2.0000");

    // exactly one line, one sale movement, one money movement after the edit
    const lines = await prisma.orderLine.findMany({ where: { orderId: order.id } });
    expect(lines).toHaveLength(1);
    const moves = await prisma.stockMovement.findMany({
      where: { orderId: order.id, movementType: "sale" },
    });
    expect(moves).toHaveLength(1);
    expect(moves[0].quantity.toFixed(4)).toBe("-2.0000");
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "order", sourceId: order.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].amount.toFixed(2)).toBe("40.00");

    expect(await balanceOf(chapati.id)).toBe("98.0000");

    // an AuditLog "correct" row for the edit (no "edit" action in the enum)
    const audit = await prisma.auditLog.findMany({
      where: { entityType: "order", entityId: order.id, action: "correct" },
    });
    expect(audit).toHaveLength(1);
  });

  it("switching payment method cash → credit: removes the MoneyMovement, writes a Debt", async () => {
    const [chapati] = ctx.products;
    const customer = await prisma.customer.create({
      data: { name: `${ctx.prefix} EditCust`, phone: "0700999888" },
    });

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "3" }],
      },
      cashierA,
    );
    await editOwnOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "credit",
        customerId: customer.id,
        lines: [{ productId: chapati.id, quantity: "3" }],
      },
      cashierA,
    );

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "order", sourceId: order.id },
    });
    expect(mm).toHaveLength(0);
    const debts = await prisma.debt.findMany({ where: { orderId: order.id } });
    expect(debts).toHaveLength(1);
    expect(debts[0].amount.toFixed(2)).toBe("60.00");
  });

  it("editing another cashier's order → FORBIDDEN", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "1" }],
      },
      cashierA,
    );
    await expect(
      editOwnOrder(
        order.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "2" }],
        },
        { userId: ctx.cashier2Id, role: "cashier", restaurantId: ctx.restaurantId },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("editing an order whose business day is closed → FORBIDDEN", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        occurredAt: new Date("2026-08-01T09:00:00Z"),
        lines: [{ productId: chapati.id, quantity: "1" }],
      },
      cashierA,
    );
    // M3 real gate: a DayClose row for that business date, not a
    // "not today" heuristic.
    await prisma.dayClose.create({
      data: { date: new Date("2026-08-01T00:00:00Z"), closedBy: ctx.adminId },
    });
    await expect(
      editOwnOrder(
        order.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "2" }],
        },
        cashierA,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("§3.8 on edit: the order's own existing sale movements are added back before comparing", async () => {
    const soda = ctx.products[2]; // opening 12
    // First order takes 10 — balance 2 left.
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: soda.id, quantity: "10" }],
      },
      cashierA,
    );
    expect(await balanceOf(soda.id)).toBe("2.0000");

    // Editing the same order up to 12 must be allowed (add back its own 10,
    // so 12 available), not blocked as if only 2 remained.
    const edited = await editOwnOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: soda.id, quantity: "12" }],
      },
      cashierA,
    );
    expect(edited.lines[0].quantity).toBe("12.0000");
    expect(await balanceOf(soda.id)).toBe("0.0000");

    // But 13 is still short.
    await expect(
      editOwnOrder(
        order.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: soda.id, quantity: "13" }],
        },
        cashierA,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });

  it("missing order → NOT_FOUND", async () => {
    await expect(
      editOwnOrder(
        "no-such-order",
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: ctx.products[0].id, quantity: "1" }],
        },
        cashierA,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
