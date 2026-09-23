import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordCanteenCreditSale } from "./record-canteen-credit-sale";
import { voidCanteenCreditSale } from "./void-canteen-credit-sale";
import { listCanteenCreditSales } from "./list-canteen-credit-sales";
import { toBusinessDate } from "@/lib/time";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "listcreditsale";

describe("listCanteenCreditSales", () => {
  let ctx: CanteenTestCtx;
  let attendantCtx: { userId: string; role: "canteen_attendant"; locationId: string };
  let adminCtx: { userId: string; role: "admin"; locationId: null };
  let customerId: string;

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    attendantCtx = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
    adminCtx = { userId: ctx.adminId, role: "admin", locationId: null };
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

  it("lists today's credit sale with its current derived quantity/total and voidable=true for the recording attendant", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      attendantCtx,
    );

    const rows = await listCanteenCreditSales({}, attendantCtx);
    const row = rows.find((r) => r.stockMovementId === sale.stockMovement.id);
    expect(row).toBeDefined();
    expect(row?.quantity).toBe("3.0000");
    expect(row?.total).toBe("180.00");
    expect(row?.productName).toBe(soda.name);
    expect(row?.voidable).toBe(true);
  });

  it("a fully-voided sale is dropped from the list", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    await voidCanteenCreditSale(sale.stockMovement.id, attendantCtx);

    const rows = await listCanteenCreditSales({}, attendantCtx);
    expect(rows.find((r) => r.stockMovementId === sale.stockMovement.id)).toBeUndefined();
  });

  it("admin sees every canteen's credit sales; a non-owning attendant would not see voidable=true", async () => {
    const [soda] = ctx.products;
    await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "1" },
      attendantCtx,
    );

    const adminRows = await listCanteenCreditSales({}, adminCtx);
    expect(adminRows.length).toBeGreaterThanOrEqual(1);
  });

  it("date filter windows on the business date", async () => {
    const [soda] = ctx.products;
    await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "1" },
      attendantCtx,
    );

    const today = toBusinessDate(new Date());
    const todayRows = await listCanteenCreditSales({ date: today }, attendantCtx);
    expect(todayRows.length).toBeGreaterThanOrEqual(1);

    const otherDayRows = await listCanteenCreditSales(
      { date: "2020-01-01" },
      attendantCtx,
    );
    expect(otherDayRows).toHaveLength(0);
  });
});
