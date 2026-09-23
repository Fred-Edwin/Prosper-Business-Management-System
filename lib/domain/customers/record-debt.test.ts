import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createCustomer } from "./create-customer";
import { recordDebt } from "./record-debt";
import { listCustomers } from "./list-customers";
import { getCustomerLedger } from "./get-customer-ledger";
import {
  cleanupCustomersTestData,
  makeOrder,
  setupCustomersTestData,
  type CustomersTestCtx,
} from "./test-helpers";

const SCOPE = "debt";

describe("recordDebt (tx-only helper for S4)", () => {
  let ctx: CustomersTestCtx;
  let P: string;

  beforeAll(async () => {
    ctx = await setupCustomersTestData(SCOPE);
    P = ctx.prefix;
  });

  afterAll(async () => {
    await cleanupCustomersTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("appends one Debt row inside a passed tx; it feeds the derived balance", async () => {
    const c = await createCustomer(
      { name: `${P}CreditCust`, phone: "0700100001" },
      { actorId: ctx.adminId },
    );
    const orderId = await makeOrder(ctx, c.id, "1250.00");

    const debt = await prisma.$transaction((tx) =>
      recordDebt(
        {
          customerId: c.id,
          orderId,
          amount: new Prisma.Decimal("1250.00"),
          occurredAt: new Date("2026-08-09T09:00:00Z"),
        },
        { tx },
      ),
    );

    expect(debt.amount.toFixed(2)).toBe("1250.00");

    const [row] = await listCustomers({ search: `${P}CreditCust` });
    expect(row.balance).toBe("1250.00");

    const ledger = await getCustomerLedger(c.id);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]).toMatchObject({ kind: "debt", orderId });
  });

  it("rolls back with the surrounding tx — no Debt persists", async () => {
    const c = await createCustomer(
      { name: `${P}RollbackCust`, phone: "0700100002" },
      { actorId: ctx.adminId },
    );
    const orderId = await makeOrder(ctx, c.id, "400.00");

    await expect(
      prisma.$transaction(async (tx) => {
        await recordDebt(
          {
            customerId: c.id,
            orderId,
            amount: new Prisma.Decimal("400.00"),
            occurredAt: new Date("2026-08-09T09:00:00Z"),
          },
          { tx },
        );
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    expect(await prisma.debt.count({ where: { customerId: c.id } })).toBe(0);
  });

  it("rejects a non-positive amount", async () => {
    const c = await createCustomer(
      { name: `${P}BadAmt`, phone: "0700100003" },
      { actorId: ctx.adminId },
    );
    const orderId = await makeOrder(ctx, c.id, "0.00");
    await expect(
      prisma.$transaction((tx) =>
        recordDebt(
          {
            customerId: c.id,
            orderId,
            amount: new Prisma.Decimal("0"),
            occurredAt: new Date(),
          },
          { tx },
        ),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("accepts a canteen_credit_sale source (ADR-91) — no orderId required", async () => {
    const c = await createCustomer(
      { name: `${P}CanteenCredit`, phone: "0700100004" },
      { actorId: ctx.adminId },
    );
    // A canteen credit sale's Debt sources a StockMovement.id, not an
    // Order — build a minimal one to point sourceId at.
    const product = await prisma.product.create({
      data: { name: `${P}Soda`, kind: "goods", unitLabel: "unit" },
    });
    const movement = await prisma.stockMovement.create({
      data: {
        productId: product.id,
        locationId: ctx.restaurantId,
        movementType: "sale",
        quantity: new Prisma.Decimal("-1"),
        customerId: c.id,
        recordedById: ctx.adminId,
        occurredAt: new Date("2026-08-09T09:00:00Z"),
      },
    });

    const debt = await prisma.$transaction((tx) =>
      recordDebt(
        {
          customerId: c.id,
          sourceType: "canteen_credit_sale",
          sourceId: movement.id,
          amount: new Prisma.Decimal("60.00"),
          occurredAt: new Date("2026-08-09T09:00:00Z"),
        },
        { tx },
      ),
    );

    expect(debt.orderId).toBeNull();
    expect(debt.sourceType).toBe("canteen_credit_sale");
    expect(debt.sourceId).toBe(movement.id);

    const [row] = await listCustomers({ search: `${P}CanteenCredit` });
    expect(row.balance).toBe("60.00");

    await prisma.stockMovement.delete({ where: { id: movement.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});
