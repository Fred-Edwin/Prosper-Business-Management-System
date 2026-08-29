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
});
