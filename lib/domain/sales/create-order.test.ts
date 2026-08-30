import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { getCustomerLedger } from "@/lib/domain/customers";
import { createOrder } from "./create-order";
import {
  cleanupSalesTestData,
  makeCustomer,
  setupSalesTestData,
  type SalesTestCtx,
} from "./test-helpers";

const SCOPE = "create";

describe("createOrder", () => {
  let ctx: SalesTestCtx;
  let cashierCtx: { userId: string; role: "cashier"; restaurantId: string };

  beforeEach(async () => {
    ctx = await setupSalesTestData(SCOPE);
    cashierCtx = {
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

  it("cash order: writes Order + lines + negative sale movements + a +total cash MoneyMovement + AuditLog; balances move", async () => {
    const [chapati, samosa] = ctx.products;

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [
          { productId: chapati.id, quantity: "2" },
          { productId: samosa.id, quantity: "3" },
        ],
      },
      cashierCtx,
    );

    // total = 2×20 + 3×50 = 190
    expect(order.total).toBe("190.00");
    expect(order.lines).toHaveLength(2);
    expect(order.cashierId).toBe(ctx.cashierId);
    expect(order.cashierName).toBe(`${ctx.prefix} Cashier A`);
    expect(order.lines[0].productName).toBe(chapati.name);
    expect(order.lines[1].productName).toBe(samosa.name);
    expect(order.locationId).toBe(ctx.restaurantId);
    expect(order.correctsOrderId).toBeNull();
    expect(order.deliveryFee).toBeNull();

    const movements = await prisma.stockMovement.findMany({
      where: { orderId: order.id, movementType: "sale" },
    });
    expect(movements).toHaveLength(2);
    expect(movements.every((m) => m.quantity.isNegative())).toBe(true);

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "order", sourceId: order.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].account).toBe("cash");
    expect(mm[0].amount.toFixed(2)).toBe("190.00");

    const audit = await prisma.auditLog.findMany({
      where: { entityType: "order", entityId: order.id, action: "create" },
    });
    expect(audit).toHaveLength(1);

    expect(await balanceOf(chapati.id)).toBe("98.0000");
    expect(await balanceOf(samosa.id)).toBe("37.0000");
  });

  it("M-Pesa order: money lands in mpesa_bank, no cash movement", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "takeaway",
        paymentMethod: "mpesa",
        lines: [{ productId: chapati.id, quantity: "5" }],
      },
      cashierCtx,
    );
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "order", sourceId: order.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].account).toBe("mpesa_bank");
    expect(mm[0].amount.toFixed(2)).toBe("100.00");
  });

  it("credit order: writes a Debt = total and NO MoneyMovement; customer balance rises", async () => {
    const [chapati] = ctx.products;
    const customerId = await makeCustomer(ctx, "Grace");

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "credit",
        customerId,
        lines: [{ productId: chapati.id, quantity: "4" }],
      },
      cashierCtx,
    );

    expect(order.total).toBe("80.00");
    expect(order.customerId).toBe(customerId);

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "order", sourceId: order.id },
    });
    expect(mm).toHaveLength(0);

    const debts = await prisma.debt.findMany({ where: { orderId: order.id } });
    expect(debts).toHaveLength(1);
    expect(debts[0].amount.toFixed(2)).toBe("80.00");
    expect(debts[0].customerId).toBe(customerId);

    const ledger = await getCustomerLedger(customerId);
    expect(ledger.balance).toBe("80.00");
  });

  it("credit without customerId → VALIDATION_ERROR field customerId, nothing written", async () => {
    const [chapati] = ctx.products;
    const ordersWhere = { location: { name: { startsWith: ctx.prefix } } };
    const ordersBefore = await prisma.order.count({ where: ordersWhere });

    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "credit",
          lines: [{ productId: chapati.id, quantity: "1" }],
        },
        cashierCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "customerId" });

    expect(await prisma.order.count({ where: ordersWhere })).toBe(ordersBefore);
  });

  it("non-credit order with a customerId → VALIDATION_ERROR field customerId", async () => {
    const [chapati] = ctx.products;
    const customerId = await makeCustomer(ctx);
    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          customerId,
          lines: [{ productId: chapati.id, quantity: "1" }],
        },
        cashierCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "customerId" });
  });

  it("delivery fee on a non-delivery order → VALIDATION_ERROR field deliveryFee, nothing written", async () => {
    const [chapati] = ctx.products;
    const ordersWhere = { location: { name: { startsWith: ctx.prefix } } };
    const ordersBefore = await prisma.order.count({ where: ordersWhere });
    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          deliveryFee: "150.00",
          lines: [{ productId: chapati.id, quantity: "1" }],
        },
        cashierCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "deliveryFee" });
    expect(await prisma.order.count({ where: ordersWhere })).toBe(ordersBefore);
  });

  it("delivery order with a fee: fee folded into total", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "delivery",
        paymentMethod: "cash",
        deliveryFee: "150.00",
        lines: [{ productId: chapati.id, quantity: "2" }],
      },
      cashierCtx,
    );
    // 2×20 + 150 = 190
    expect(order.total).toBe("190.00");
    expect(order.deliveryFee).toBe("150.00");
    const mm = await prisma.moneyMovement.findFirst({
      where: { sourceType: "order", sourceId: order.id },
    });
    expect(mm?.amount.toFixed(2)).toBe("190.00");
  });

  it("§3.8: a line above the derived Restaurant balance → VALIDATION_ERROR field lines; zero rows written; balance unchanged and not negative", async () => {
    // Soda opening is 12. Scope every count to this suite's own rows —
    // parallel test files write to the same tables.
    const soda = ctx.products[2];
    const chapati = ctx.products[0];
    const suiteProductIds = ctx.products.map((p) => p.id);
    const ordersWhere = { location: { name: { startsWith: ctx.prefix } } };
    const suiteMovesWhere = { productId: { in: suiteProductIds } };

    const ordersBefore = await prisma.order.count({ where: ordersWhere });
    const linesBefore = await prisma.orderLine.count({
      where: { productId: { in: suiteProductIds } },
    });
    const movesBefore = await prisma.stockMovement.count({ where: suiteMovesWhere });

    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [
            { productId: chapati.id, quantity: "1" }, // fine
            { productId: soda.id, quantity: "20" }, // short (only 12)
          ],
        },
        cashierCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });

    expect(await prisma.order.count({ where: ordersWhere })).toBe(ordersBefore);
    expect(
      await prisma.orderLine.count({ where: { productId: { in: suiteProductIds } } }),
    ).toBe(linesBefore);
    expect(await prisma.stockMovement.count({ where: suiteMovesWhere })).toBe(
      movesBefore,
    );
    // No order row was created, so no order MoneyMovement can exist for it.
    const suiteOrders = await prisma.order.findMany({
      where: ordersWhere,
      select: { id: true },
    });
    const mmForSuite = await prisma.moneyMovement.count({
      where: {
        sourceType: "order",
        sourceId: { in: suiteOrders.map((o) => o.id) },
      },
    });
    expect(mmForSuite).toBe(0);

    const sodaBal = await balanceOf(soda.id);
    expect(sodaBal).toBe("12.0000");
    expect(sodaBal.startsWith("-")).toBe(false);
  });

  it("§3.8: two lines for the same product summed against the balance", async () => {
    const soda = ctx.products[2]; // opening 12
    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [
            { productId: soda.id, quantity: "8" },
            { productId: soda.id, quantity: "8" }, // 16 > 12
          ],
        },
        cashierCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });

  it("§3.8: an exact-balance order is allowed and drives the balance to zero", async () => {
    const soda = ctx.products[2]; // opening 12
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: soda.id, quantity: "12" }],
      },
      cashierCtx,
    );
    expect(order.total).toBe("720.00");
    expect(await balanceOf(soda.id)).toBe("0.0000");
  });

  it("rejects a product not sold at the Restaurant", async () => {
    const orphan = await prisma.product.create({
      data: { name: `${ctx.prefix} Orphan`, kind: "goods", unitLabel: "unit" },
    });
    await expect(
      createOrder(
        {
          orderType: "dine_in",
          paymentMethod: "cash",
          lines: [{ productId: orphan.id, quantity: "1" }],
        },
        cashierCtx,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "lines" });
  });

  it("no order payload carries a margin / cost / buyingPrice field", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        lines: [{ productId: chapati.id, quantity: "1" }],
      },
      cashierCtx,
    );
    const json = JSON.stringify(order);
    expect(json).not.toMatch(/buyingPrice|margin|unitCost|profit/i);
  });
});
