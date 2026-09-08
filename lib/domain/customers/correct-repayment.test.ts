import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createCustomer } from "./create-customer";
import { getCustomerLedger } from "./get-customer-ledger";
import { recordRepayment } from "./record-repayment";
import { correctRepayment, voidRepayment } from "./correct-repayment";
import {
  cleanupCustomersTestData,
  makeDebt,
  setupCustomersTestData,
  type CustomersTestCtx,
} from "./test-helpers";

const SCOPE = "correct_repayment";

/**
 * Net money movement for one repayment (original + its correction rows),
 * scoped by the `sourceId`s so the shared worker schema doesn't leak in.
 */
async function moneyForOriginal(
  originalId: string,
  account?: "cash" | "mpesa_bank",
): Promise<number> {
  const ids = [
    originalId,
    ...(
      await prisma.repayment.findMany({
        where: { correctsRepaymentId: originalId },
        select: { id: true },
      })
    ).map((r) => r.id),
  ];
  const rows = await prisma.moneyMovement.findMany({
    where: {
      sourceType: "repayment",
      sourceId: { in: ids },
      ...(account ? { account } : {}),
    },
    select: { amount: true },
  });
  return rows.reduce((acc, r) => acc + Number(r.amount), 0);
}

describe("correctRepayment / voidRepayment (ADR-72)", () => {
  let ctx: CustomersTestCtx;
  let P: string;
  const admin = () => ({ actorId: ctx.adminId, role: "admin" }) as const;

  beforeAll(async () => {
    ctx = await setupCustomersTestData(SCOPE);
    P = ctx.prefix;
  });
  afterAll(async () => {
    await cleanupCustomersTestData(SCOPE);
    await prisma.$disconnect();
  });

  async function seed(
    amount = "1000.00",
    account: "cash" | "mpesa_bank" = "cash",
    debt = "5000.00",
  ) {
    const c = await createCustomer(
      { name: `${P}${Math.random()}`, phone: "0712000000" },
      { actorId: ctx.adminId },
    );
    await makeDebt(ctx, c.id, debt, new Date("2026-08-01T09:00:00Z"));
    const r = await recordRepayment(
      { customerId: c.id, amount, account, occurredAt: new Date("2026-08-05T09:00:00Z") },
      { actorId: ctx.adminId },
    );
    return { customerId: c.id, repayment: r };
  }

  it("writes a signed delta row and moves money by the delta (repayment reduced)", async () => {
    const { customerId, repayment } = await seed("1000.00"); // +1000 cash
    expect(await moneyForOriginal(repayment.id)).toBe(1000);

    await correctRepayment(
      { repaymentId: repayment.id, amount: "600.00" },
      admin(),
    );

    const rows = await prisma.repayment.findMany({
      where: {
        OR: [{ id: repayment.id }, { correctsRepaymentId: repayment.id }],
      },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].correctsRepaymentId).toBe(repayment.id);
    expect(Number(rows[1].amount)).toBe(-400); // signed delta
    expect(rows[1].occurredAt.toISOString()).toBe(rows[0].occurredAt.toISOString());

    // Cash nets to +600.
    expect(await moneyForOriginal(repayment.id)).toBe(600);

    // Balance rose from 4000 to 4400 (less was repaid).
    const ledger = await getCustomerLedger(customerId);
    expect(ledger.balance).toBe("4400.00");
  });

  it("folds the correction into the ledger — one repayment line, derived amount", async () => {
    const { customerId, repayment } = await seed("1000.00");
    await correctRepayment(
      { repaymentId: repayment.id, amount: "1500.00" },
      admin(),
    );

    const ledger = await getCustomerLedger(customerId);
    const repayEntries = ledger.entries.filter((e) => e.kind === "repayment");
    expect(repayEntries).toHaveLength(1);
    expect(repayEntries[0].amount).toBe("1500.00");
    expect(repayEntries[0].repaymentId).toBe(repayment.id);
    // Balance: 5000 debt − 1500 repaid = 3500.
    expect(ledger.balance).toBe("3500.00");
  });

  it("an account change refunds the old account and debits the new one", async () => {
    const { repayment } = await seed("800.00", "cash");
    expect(await moneyForOriginal(repayment.id, "cash")).toBe(800);

    await correctRepayment(
      { repaymentId: repayment.id, amount: "800.00", account: "mpesa_bank" },
      admin(),
    );

    // Cash back to 0, M-Pesa now holds the 800.
    expect(await moneyForOriginal(repayment.id, "cash")).toBe(0);
    expect(await moneyForOriginal(repayment.id, "mpesa_bank")).toBe(800);
  });

  it("re-submitting the same amount + account is rejected (delta 0)", async () => {
    const { repayment } = await seed("1000.00");
    await expect(
      correctRepayment(
        { repaymentId: repayment.id, amount: "1000.00" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("a correction row cannot itself be corrected (no chaining)", async () => {
    const { repayment } = await seed("1000.00");
    await correctRepayment(
      { repaymentId: repayment.id, amount: "500.00" },
      admin(),
    );
    const correction = await prisma.repayment.findFirstOrThrow({
      where: { correctsRepaymentId: repayment.id },
    });
    await expect(
      correctRepayment(
        { repaymentId: correction.id, amount: "1.00" },
        admin(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a corrected amount of zero or below", async () => {
    const { repayment } = await seed("1000.00");
    await expect(
      correctRepayment({ repaymentId: repayment.id, amount: "0" }, admin()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "amount" });
  });

  it("non-admin is FORBIDDEN for both correct and void", async () => {
    const { repayment } = await seed("1000.00");
    await expect(
      correctRepayment(
        { repaymentId: repayment.id, amount: "900.00" },
        { actorId: ctx.cashierId, role: "cashier" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      voidRepayment(repayment.id, { actorId: ctx.cashierId, role: "cashier" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("writes an audit-log row with matching was/now scalar keys", async () => {
    const { repayment } = await seed("3000.00", "cash");
    await correctRepayment(
      { repaymentId: repayment.id, amount: "1000.00", account: "mpesa_bank" },
      admin(),
    );
    const log = await prisma.auditLog.findFirstOrThrow({
      where: {
        entityType: "repayment",
        entityId: repayment.id,
        action: "correct",
      },
    });
    const oldV = log.oldValue as Record<string, unknown>;
    const newV = log.newValue as Record<string, unknown>;
    expect(oldV.amount).toBe("3000.00");
    expect(oldV.account).toBe("Cash");
    expect(newV.amount).toBe("1000.00");
    expect(newV.account).toBe("M-Pesa / Bank Till");
    expect(newV.correctionId).toBeDefined();
  });

  it("a correction that overpays is allowed and drives the balance negative (same rule as overpayment)", async () => {
    // debt 1000, repay 1000 → settled; correct repayment up to 1500 → −500 (credit).
    const { customerId, repayment } = await seed("1000.00", "cash", "1000.00");
    await correctRepayment(
      { repaymentId: repayment.id, amount: "1500.00" },
      admin(),
    );
    const ledger = await getCustomerLedger(customerId);
    expect(ledger.balance).toBe("-500.00");
    expect(await moneyForOriginal(repayment.id)).toBe(1500);
  });

  describe("voidRepayment", () => {
    it("reverses the repayment and returns the money effect to zero", async () => {
      const { customerId, repayment } = await seed("2000.00"); // +2000 cash
      await voidRepayment(repayment.id, admin());

      expect(await moneyForOriginal(repayment.id)).toBe(0);

      const reversal = await prisma.repayment.findFirstOrThrow({
        where: { correctsRepaymentId: repayment.id },
      });
      expect(Number(reversal.amount)).toBe(-2000);

      // The repayment drops off the ledger entirely; balance back to the full debt.
      const ledger = await getCustomerLedger(customerId);
      expect(ledger.entries.filter((e) => e.kind === "repayment")).toHaveLength(0);
      expect(ledger.balance).toBe("5000.00");
    });

    it("voiding after a correction reverses the derived amount, not the original", async () => {
      const { repayment } = await seed("1000.00");
      await correctRepayment(
        { repaymentId: repayment.id, amount: "1800.00" },
        admin(),
      ); // derived now 1800
      await voidRepayment(repayment.id, admin());
      expect(await moneyForOriginal(repayment.id)).toBe(0);
    });

    it("voiding an already-voided repayment is rejected", async () => {
      const { repayment } = await seed("1000.00");
      await voidRepayment(repayment.id, admin());
      await expect(
        voidRepayment(repayment.id, admin()),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("writes a soft_delete audit row", async () => {
      const { repayment } = await seed("1200.00");
      await voidRepayment(repayment.id, admin());
      const log = await prisma.auditLog.findFirstOrThrow({
        where: {
          entityType: "repayment",
          entityId: repayment.id,
          action: "soft_delete",
        },
      });
      const newV = log.newValue as Record<string, unknown>;
      expect(newV.voided).toBe(true);
      expect(newV.reversalId).toBeDefined();
    });
  });
});
