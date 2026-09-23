import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { DomainError } from "./errors";
import { recordCanteenCreditSale } from "./record-canteen-credit-sale";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "creditsale";

describe("recordCanteenCreditSale", () => {
  let ctx: CanteenTestCtx;
  let attendantCtx: { userId: string; role: "canteen_attendant"; locationId: string };
  let customerId: string;

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    attendantCtx = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
    customerId = await makeCustomer(ctx);
    // Stock on hand so the sale has something to sell against.
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "50",
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    });
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("writes a sale StockMovement (no stockCountId) and a Debt, reduces stock immediately", async () => {
    const [soda] = ctx.products; // sellingPrice 60.00
    const result = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      attendantCtx,
    );

    expect(result.total).toBe("180.00");
    expect(result.unitPrice).toBe("60.00");
    expect(result.debt.amount).toBe("180.00");
    expect(result.debt.customerId).toBe(customerId);

    const movement = await prisma.stockMovement.findUnique({
      where: { id: result.stockMovement.id },
    });
    expect(movement?.stockCountId).toBeNull();
    expect(movement?.customerId).toBe(customerId);
    expect(movement?.quantity.toString()).toBe("-3");

    const debt = await prisma.debt.findUnique({ where: { id: result.debt.id } });
    expect(debt?.sourceType).toBe("canteen_credit_sale");
    expect(debt?.sourceId).toBe(result.stockMovement.id);
    expect(debt?.orderId).toBeNull();

    const balance = await getDerivedStockBalance({
      productId: soda.id,
      locationId: ctx.canteenId,
    });
    expect(balance.quantity.toString()).toBe("47.0000");

    // Scoped by sourceId (the StockCount id this credit sale is NOT
    // linked to) rather than an unscoped sourceType query — this suite
    // runs concurrently with others that legitimately write canteen_sale
    // MoneyMovements for their own StockCounts.
    const moneyMovement = await prisma.moneyMovement.findFirst({
      where: { sourceType: "canteen_sale", sourceId: result.stockMovement.id },
    });
    expect(moneyMovement).toBeNull();
  });

  it("writes a create AuditLog row with the snapshotted unit price", async () => {
    const [soda] = ctx.products;
    const result = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "canteen_credit_sale", entityId: result.stockMovement.id },
    });
    expect(audit?.action).toBe("create");
    expect((audit?.newValue as Record<string, unknown>)?.unitPrice).toBe("60.00");
  });

  it("rejects a zero quantity", async () => {
    const [soda] = ctx.products;
    await expect(
      recordCanteenCreditSale(
        { productId: soda.id, customerId, quantity: "0" },
        attendantCtx,
      ),
    ).rejects.toThrow(DomainError);
  });

  it("rejects a product not sold at the canteen", async () => {
    const other = await prisma.product.create({
      data: { name: `${ctx.prefix} Not Canteen`, kind: "goods", unitLabel: "unit" },
    });
    await expect(
      recordCanteenCreditSale(
        { productId: other.id, customerId, quantity: "1" },
        attendantCtx,
      ),
    ).rejects.toThrow(DomainError);
  });

  it("rejects a quantity exceeding current canteen stock", async () => {
    const [soda] = ctx.products; // 50 on hand
    await expect(
      recordCanteenCreditSale(
        { productId: soda.id, customerId, quantity: "51" },
        attendantCtx,
      ),
    ).rejects.toThrow(/Not enough Canteen stock/);
  });

  it("rejects an unknown customer", async () => {
    const [soda] = ctx.products;
    await expect(
      recordCanteenCreditSale(
        { productId: soda.id, customerId: "00000000-0000-0000-0000-000000000000", quantity: "1" },
        attendantCtx,
      ),
    ).rejects.toThrow(DomainError);
  });

  it("rejects when the attendant has no assigned canteen", async () => {
    const [soda] = ctx.products;
    await expect(
      recordCanteenCreditSale(
        { productId: soda.id, customerId, quantity: "1" },
        { userId: ctx.attendantId, role: "canteen_attendant", locationId: null },
      ),
    ).rejects.toThrow(DomainError);
  });

  it("rejects a non-today occurredAt for a non-admin actor (ADR-53)", async () => {
    const [soda] = ctx.products;
    await expect(
      recordCanteenCreditSale(
        {
          productId: soda.id,
          customerId,
          quantity: "1",
          occurredAt: new Date("2020-01-01T06:00:00Z"),
        },
        attendantCtx,
      ),
    ).rejects.toThrow(DomainError);
  });
});
