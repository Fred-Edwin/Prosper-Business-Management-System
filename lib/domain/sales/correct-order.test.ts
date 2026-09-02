import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { getCustomerLedger } from "@/lib/domain/customers";

/** Σ of every order MoneyMovement across a correction chain — the derived money effect. */
async function orderMoneyNet(orderIds: string[]): Promise<string> {
  const agg = await prisma.moneyMovement.aggregate({
    _sum: { amount: true },
    where: { sourceType: "order", sourceId: { in: orderIds } },
  });
  return (agg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2);
}

async function chainIds(originalId: string): Promise<string[]> {
  const corr = await prisma.order.findMany({
    where: { correctsOrderId: originalId },
    select: { id: true },
  });
  return [originalId, ...corr.map((c) => c.id)];
}
import { createOrder } from "./create-order";
import { correctOrder } from "./correct-order";
import {
  cleanupSalesTestData,
  setupSalesTestData,
  type SalesTestCtx,
} from "./test-helpers";

const SCOPE = "correct";

describe("correctOrder", () => {
  let ctx: SalesTestCtx;
  let cashier: { userId: string; role: "cashier"; restaurantId: string };
  let admin: { userId: string; role: "admin"; restaurantId: string };

  beforeEach(async () => {
    ctx = await setupSalesTestData(SCOPE);
    cashier = {
      userId: ctx.cashierId,
      role: "cashier",
      restaurantId: ctx.restaurantId,
    };
    admin = {
      userId: ctx.adminId,
      role: "admin",
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

  it("admin corrects a cash order's line qty down: a new Order (correctsOrderId set); net stock + net money = the corrected state", async () => {
    const [chapati] = ctx.products; // opening 100, price 20

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        // occurredAt defaults to today — staff may only write today (ADR-53).
        lines: [{ productId: chapati.id, quantity: "5" }],
      },
      cashier,
    );
    expect(order.total).toBe("100.00");
    expect(await balanceOf(chapati.id)).toBe("95.0000");

    const correction = await correctOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "2" }],
      },
      admin,
    );

    expect(correction.id).not.toBe(order.id);
    expect(correction.correctsOrderId).toBe(order.id);
    expect(correction.total).toBe("40.00");
    expect(correction.cashierId).toBe(ctx.cashierId); // corrected on their behalf
    expect(correction.cashierName).toBe(`${ctx.prefix} Cashier A`);
    expect(correction.lines[0].productName).toBe(chapati.name);

    // original row untouched
    const originalAfter = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { lines: true },
    });
    expect(originalAfter.total.toFixed(2)).toBe("100.00");
    expect(originalAfter.lines[0].quantity.toFixed(4)).toBe("5.0000");

    // net stock effect = corrected: 100 − 2 = 98
    expect(await balanceOf(chapati.id)).toBe("98.0000");
    // net money effect across the chain = the corrected total only
    expect(await orderMoneyNet(await chainIds(order.id))).toBe("40.00");

    // the correction carries its occurredAt from the original
    expect(correction.occurredAt).toBe(order.occurredAt);

    // AuditLog "correct" on the new row
    const audit = await prisma.auditLog.findMany({
      where: { entityType: "order", entityId: correction.id, action: "correct" },
    });
    expect(audit).toHaveLength(1);
  });

  it("re-submitting the identical correction → VALIDATION_ERROR 'nothing to correct'; no second delta", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "5" }],
      },
      cashier,
    );
    const correctedInput = {
      orderType: "dine_in" as const,
      paymentMethod: "cash" as const,
      lines: [{ productId: chapati.id, quantity: "2" }],
    };
    await correctOrder(order.id, correctedInput, admin);
    const balAfterFirst = await balanceOf(chapati.id);

    await expect(
      correctOrder(order.id, correctedInput, admin),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(await balanceOf(chapati.id)).toBe(balAfterFirst); // no second move
  });

  it("a cashier calling correctOrder → FORBIDDEN", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "1" }],
      },
      cashier,
    );
    await expect(
      correctOrder(
        order.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "2" }],
        },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("correcting a correction row → VALIDATION_ERROR", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "5" }],
      },
      cashier,
    );
    const correction = await correctOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "3" }],
      },
      admin,
    );
    await expect(
      correctOrder(
        correction.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: chapati.id, quantity: "2" }],
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("missing order → NOT_FOUND", async () => {
    await expect(
      correctOrder(
        "no-such",
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: ctx.products[0].id, quantity: "1" }],
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("payment-method change on correction: credit → cash reverses the Debt and writes a MoneyMovement", async () => {
    const [chapati] = ctx.products;
    const customer = await prisma.customer.create({
      data: { name: `${ctx.prefix} CorrCust`, phone: "0711000000" },
    });

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "credit",
        customerId: customer.id,
        lines: [{ productId: chapati.id, quantity: "4" }], // 80.00 debt
      },
      cashier,
    );
    expect((await getCustomerLedger(customer.id)).balance).toBe("80.00");

    await correctOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "4" }], // now paid cash
      },
      admin,
    );

    // customer no longer owes (debt net 0)
    expect((await getCustomerLedger(customer.id)).balance).toBe("0.00");
    // the order's net money effect across the chain is now the corrected
    // cash total (a reversing/zero debt on the customer, +80 in cash)
    expect(await orderMoneyNet(await chainIds(order.id))).toBe("80.00");
  });

  it("§3.8 on correction: measured against the balance with the original's sale movements added back", async () => {
    const soda = ctx.products[2]; // opening 12
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: soda.id, quantity: "10" }],
      },
      cashier,
    );
    expect(await balanceOf(soda.id)).toBe("2.0000");

    // Correcting up to 12 is allowed (add back the original 10 → 12 avail).
    const correction = await correctOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: soda.id, quantity: "12" }],
      },
      admin,
    );
    expect(correction.total).toBe("720.00");
    expect(await balanceOf(soda.id)).toBe("0.0000");

    // 13 is still short.
    await expect(
      correctOrder(
        order.id,
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: soda.id, quantity: "13" }],
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });
});
