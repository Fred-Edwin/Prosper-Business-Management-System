import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { DomainError } from "./errors";
import { recordCanteenCreditSale } from "./record-canteen-credit-sale";
import { voidCanteenCreditSale } from "./void-canteen-credit-sale";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "voidcreditsale";

describe("voidCanteenCreditSale", () => {
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

  it("returns the stock and zeroes the debt", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      attendantCtx,
    );

    await voidCanteenCreditSale(sale.stockMovement.id, attendantCtx);

    const balance = await getDerivedStockBalance({
      productId: soda.id,
      locationId: ctx.canteenId,
    });
    expect(balance.quantity.toString()).toBe("50.0000");

    const debtSum = await prisma.debt.aggregate({
      _sum: { amount: true },
      where: { sourceType: "canteen_credit_sale", sourceId: sale.stockMovement.id },
    });
    expect(debtSum._sum.amount?.toString()).toBe("0");

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "canteen_credit_sale",
        entityId: sale.stockMovement.id,
        action: "soft_delete",
      },
    });
    expect(audit).not.toBeNull();
  });

  it("rejects voiding an already-voided sale", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    await voidCanteenCreditSale(sale.stockMovement.id, attendantCtx);
    await expect(
      voidCanteenCreditSale(sale.stockMovement.id, attendantCtx),
    ).rejects.toThrow(/already voided/);
  });

  it("rejects another attendant's sale", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "1" },
      attendantCtx,
    );
    const otherAttendant = await prisma.user.create({
      data: {
        name: `${ctx.prefix} Other Attendant`,
        pinHash: "x",
        role: "canteen_attendant",
        active: true,
      },
    });
    await expect(
      voidCanteenCreditSale(sale.stockMovement.id, {
        userId: otherAttendant.id,
        role: "canteen_attendant",
        locationId: ctx.canteenId,
      }),
    ).rejects.toThrow(DomainError);
  });

  it("rejects a non-existent stock movement", async () => {
    await expect(
      voidCanteenCreditSale("00000000-0000-0000-0000-000000000000", attendantCtx),
    ).rejects.toThrow(DomainError);
  });
});
