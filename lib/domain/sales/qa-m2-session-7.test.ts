/**
 * M2 Session 7 — QA Sprint adversarial tests.
 *
 * These are the "attack list" scenarios from `milestone-2-plan.md` §7 that
 * the existing per-session suites did not already cover end to end:
 *
 *   A. Money-ledger integrity — every payment path reconciles against
 *      Σ MoneyMovement for the account, with no stored total.
 *   B. Order corrections chained twice / correction-of-a-correction — net
 *      effect on stock + money + debt equals the final corrected state,
 *      never zero and never doubled (M1 F-1 idempotency across a chain).
 *   C. Credit balances derive correctly across multiple debts + partial
 *      repayments + an overpayment, and a credit-order correction reverses
 *      the Debt so the derived balance is right.
 *   D. Canteen derived-sales math exact across a period boundary with
 *      transfers-in + production + non-sale consumption between two counts.
 *   E. Cross-cashier isolation at the domain layer for read + correct.
 *   G. Day-boundary correctness (Africa/Nairobi) for the edit window.
 *
 * Style: the existing per-domain test-file pattern — real Postgres,
 * suite-namespaced fixtures, cleaned up per file.
 */
import { Prisma } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getAccountBalances } from "@/lib/domain/financials";
import { getCustomerLedger, recordRepayment } from "@/lib/domain/customers";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { createOrder } from "./create-order";
import { editOwnOrder } from "./edit-own-order";
import { correctOrder } from "./correct-order";
import { listOrders } from "./list-orders";
import { recordStockCount } from "./record-stock-count";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  setupSalesTestData,
  type CanteenTestCtx,
  type SalesTestCtx,
} from "./test-helpers";
import { toBusinessDate } from "@/lib/time";

const ZERO = new Prisma.Decimal(0);

/** Σ MoneyMovement.amount for one account over the whole ledger. */
async function acctSum(account: "cash" | "mpesa_bank"): Promise<string> {
  const agg = await prisma.moneyMovement.aggregate({
    _sum: { amount: true },
    where: { account },
  });
  return (agg._sum.amount ?? ZERO).toFixed(2);
}

async function chainIds(originalId: string): Promise<string[]> {
  const corr = await prisma.order.findMany({
    where: { correctsOrderId: originalId },
    select: { id: true },
  });
  return [originalId, ...corr.map((c) => c.id)];
}

async function orderMoneyNet(orderIds: string[]): Promise<string> {
  const agg = await prisma.moneyMovement.aggregate({
    _sum: { amount: true },
    where: { sourceType: "order", sourceId: { in: orderIds } },
  });
  return (agg._sum.amount ?? ZERO).toFixed(2);
}

async function orderDebtNet(orderIds: string[]): Promise<string> {
  const agg = await prisma.debt.aggregate({
    _sum: { amount: true },
    where: { orderId: { in: orderIds } },
  });
  return (agg._sum.amount ?? ZERO).toFixed(2);
}

/**
 * `cleanupSalesTestData` clears order / canteen_sale money rows but not
 * `sourceType: "repayment"` ones — those FK a `User.recordedById` with
 * RESTRICT, so they must go before the suite's users are deleted. Any test
 * here that calls `recordRepayment` runs this first.
 */
async function cleanupOrphanRepaymentMoney(prefix: string): Promise<void> {
  const custIds = (
    await prisma.customer.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true },
    })
  ).map((c) => c.id);
  if (custIds.length === 0) return;
  const repayIds = (
    await prisma.repayment.findMany({
      where: { customerId: { in: custIds } },
      select: { id: true },
    })
  ).map((r) => r.id);
  if (repayIds.length === 0) return;
  // The paired AuditLog rows are keyed by the suite's user ids, which
  // `cleanupSalesTestData` already clears before deleting users.
  await prisma.moneyMovement.deleteMany({
    where: { sourceType: "repayment", sourceId: { in: repayIds } },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// A + B + C — Restaurant orders: money ledger, chained corrections, credit
// ─────────────────────────────────────────────────────────────────────────

describe("QA-S7 · Restaurant orders — money ledger, corrections, credit", () => {
  const SCOPE = "qa_s7_orders";
  let ctx: SalesTestCtx;
  let cashier: { userId: string; role: "cashier"; restaurantId: string };
  let cashier2: { userId: string; role: "cashier"; restaurantId: string };
  let admin: { userId: string; role: "admin"; restaurantId: string };

  beforeEach(async () => {
    ctx = await setupSalesTestData(SCOPE, [
      { name: "Chapati", sellingPrice: "20.00", opening: "1000" },
      { name: "Samosa", sellingPrice: "50.00", opening: "1000" },
    ]);
    cashier = { userId: ctx.cashierId, role: "cashier", restaurantId: ctx.restaurantId };
    cashier2 = { userId: ctx.cashier2Id, role: "cashier", restaurantId: ctx.restaurantId };
    admin = { userId: ctx.adminId, role: "admin", restaurantId: ctx.restaurantId };
  });
  afterEach(async () => {
    await cleanupOrphanRepaymentMoney(ctx.prefix);
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("A — cash / M-Pesa / credit orders + a repayment reconcile exactly against Σ MoneyMovement per account", async () => {
    const [chapati, samosa] = ctx.products;

    const cash0 = await acctSum("cash");
    const mpesa0 = await acctSum("mpesa_bank");

    // 1. cash order — KES 200 into cash, nothing into mpesa_bank.
    await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        occurredAt: new Date("2026-08-10T09:00:00Z"),
        lines: [{ productId: chapati.id, quantity: "10" }], // 10 × 20
      },
      cashier,
    );
    expect(await acctSum("cash")).toBe(
      new Prisma.Decimal(cash0).add(200).toFixed(2),
    );
    expect(await acctSum("mpesa_bank")).toBe(mpesa0);

    // 2. M-Pesa order — KES 500 into mpesa_bank only.
    await createOrder(
      {
        orderType: "takeaway",
        paymentMethod: "mpesa",
        occurredAt: new Date("2026-08-10T10:00:00Z"),
        lines: [{ productId: samosa.id, quantity: "10" }], // 10 × 50
      },
      cashier,
    );
    expect(await acctSum("cash")).toBe(
      new Prisma.Decimal(cash0).add(200).toFixed(2),
    );
    expect(await acctSum("mpesa_bank")).toBe(
      new Prisma.Decimal(mpesa0).add(500).toFixed(2),
    );

    // 3. credit order — NO money movement, a Debt instead.
    const custId = await makeCustomer(ctx, "Grace");
    const credit = await createOrder(
      {
        orderType: "delivery",
        deliveryFee: "50.00",
        paymentMethod: "credit",
        customerId: custId,
        occurredAt: new Date("2026-08-10T11:00:00Z"),
        lines: [{ productId: chapati.id, quantity: "5" }], // 5 × 20 + 50 = 150
      },
      cashier,
    );
    expect(credit.total).toBe("150.00");
    expect(await orderMoneyNet([credit.id])).toBe("0.00");
    expect(await orderDebtNet([credit.id])).toBe("150.00");
    // account balances unchanged by the credit order
    expect(await acctSum("cash")).toBe(
      new Prisma.Decimal(cash0).add(200).toFixed(2),
    );

    // 4. repayment — KES 100 into mpesa_bank.
    await recordRepayment(
      { customerId: custId, amount: "100.00", account: "mpesa_bank" },
      { actorId: ctx.adminId },
    );
    expect(await acctSum("mpesa_bank")).toBe(
      new Prisma.Decimal(mpesa0).add(500).add(100).toFixed(2),
    );

    // Final reconciliation: getAccountBalances (the derived read) matches
    // the raw Σ, and reflects exactly (cash +200) / (mpesa +600).
    const derived = await getAccountBalances();
    expect(derived.cash.toFixed(2)).toBe(await acctSum("cash"));
    expect(derived.mpesaBank.toFixed(2)).toBe(await acctSum("mpesa_bank"));
    expect(
      derived.cash.sub(new Prisma.Decimal(cash0)).toFixed(2),
    ).toBe("200.00");
    expect(
      derived.mpesaBank.sub(new Prisma.Decimal(mpesa0)).toFixed(2),
    ).toBe("600.00");

    // Customer's derived balance: 150 debt − 100 repaid = 50.
    const ledger = await getCustomerLedger(custId);
    expect(ledger.balance).toBe("50.00");
  });

  it("B — correcting the SAME original TWICE: net stock + money = the final corrected state, not doubled, not zero", async () => {
    const [chapati] = ctx.products; // price 20, opening 1000

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        occurredAt: new Date("2026-08-10T09:00:00Z"),
        lines: [{ productId: chapati.id, quantity: "10" }], // total 200
      },
      cashier,
    );
    const cashAfterCreate = await acctSum("cash");
    expect(await getDerivedStockBalance({ productId: chapati.id, locationId: ctx.restaurantId }).then((b) => b.quantity)).toBe("990.0000");

    // First correction: 10 → 6 (total 120).
    await correctOrder(
      order.id,
      { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "6" }] },
      admin,
    );
    // Second correction of the SAME original: 6 → 9 (total 180).
    const corr2 = await correctOrder(
      order.id,
      { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "9" }] },
      admin,
    );
    expect(corr2.correctsOrderId).toBe(order.id); // corrections don't chain

    const chain = await chainIds(order.id);
    // net money across the whole chain = the final corrected total only
    expect(await orderMoneyNet(chain)).toBe("180.00");
    // cash moved by exactly (180 − 200) = −20 relative to just-after-create
    expect(await acctSum("cash")).toBe(
      new Prisma.Decimal(cashAfterCreate).sub(20).toFixed(2),
    );
    // net stock effect = final corrected: 1000 − 9 = 991
    expect(
      await getDerivedStockBalance({ productId: chapati.id, locationId: ctx.restaurantId }).then((b) => b.quantity),
    ).toBe("991.0000");

    // original row still pristine
    const orig = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { lines: true } });
    expect(orig.total.toFixed(2)).toBe("200.00");
    expect(orig.lines[0].quantity.toFixed(4)).toBe("10.0000");
  });

  it("B — correcting a correction row is rejected (must correct the original)", async () => {
    const [chapati] = ctx.products;
    const order = await createOrder(
      { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "4" }] },
      cashier,
    );
    const corr = await correctOrder(
      order.id,
      { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "3" }] },
      admin,
    );
    await expect(
      correctOrder(
        corr.id,
        { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "2" }] },
        admin,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("C — correcting a CREDIT order down reverses the Debt so the customer's derived balance is right", async () => {
    const [chapati] = ctx.products; // price 20
    const custId = await makeCustomer(ctx, "John");

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "credit",
        customerId: custId,
        occurredAt: new Date("2026-08-10T09:00:00Z"),
        lines: [{ productId: chapati.id, quantity: "10" }], // debt 200
      },
      cashier,
    );
    expect((await getCustomerLedger(custId)).balance).toBe("200.00");

    // partial repayment while the debt stands
    await recordRepayment(
      { customerId: custId, amount: "50.00", account: "cash" },
      { actorId: ctx.adminId },
    );
    expect((await getCustomerLedger(custId)).balance).toBe("150.00");

    // Admin corrects the credit order 10 → 4 (debt should become 80).
    await correctOrder(
      order.id,
      {
        orderType: "dine_in",
        paymentMethod: "credit",
        customerId: custId,
        lines: [{ productId: chapati.id, quantity: "4" }],
      },
      admin,
    );

    // net debt for the order across the chain = 80; minus the 50 repaid = 30.
    const chain = await chainIds(order.id);
    expect(await orderDebtNet(chain)).toBe("80.00");
    expect((await getCustomerLedger(custId)).balance).toBe("30.00");
    // a credit-order correction still writes no MoneyMovement
    expect(await orderMoneyNet(chain)).toBe("0.00");
  });

  it("C — overpayment is accepted and drives the derived balance negative (flagged, not absorbed)", async () => {
    const [chapati] = ctx.products;
    const custId = await makeCustomer(ctx, "Peter");
    await createOrder(
      { orderType: "dine_in", paymentMethod: "credit", customerId: custId, lines: [{ productId: chapati.id, quantity: "5" }] },
      cashier,
    ); // debt 100
    await recordRepayment(
      { customerId: custId, amount: "250.00", account: "cash" },
      { actorId: ctx.adminId },
    );
    const ledger = await getCustomerLedger(custId);
    // −150 = credit in hand; the sign is visible, not silently clamped to 0
    expect(ledger.balance).toBe("-150.00");
    expect(Number(ledger.balance)).toBeLessThan(0);
  });

  it("E — a cashier cannot read another cashier's order via listOrders, and cannot correct one", async () => {
    const [chapati] = ctx.products;
    const bOrder = await createOrder(
      { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "2" }] },
      cashier2,
    );

    // Cashier A's list never contains Cashier B's order …
    const aList = await listOrders({}, cashier);
    expect(aList.some((o) => o.id === bOrder.id)).toBe(false);
    // … even when A explicitly asks for B's id.
    const aListForB = await listOrders({ cashierId: ctx.cashier2Id }, cashier);
    expect(aListForB).toEqual([]);
    // Admin sees it.
    const adminList = await listOrders({ cashierId: ctx.cashier2Id }, admin);
    expect(adminList.some((o) => o.id === bOrder.id)).toBe(true);

    // A cashier calling correctOrder → FORBIDDEN (Admin-only).
    await expect(
      correctOrder(
        bOrder.id,
        { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "1" }] },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("E — editOwnOrder on another cashier's order → FORBIDDEN, nothing changes", async () => {
    const [chapati] = ctx.products;
    const bOrder = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        occurredAt: new Date(), // today, so the day-open gate would otherwise pass
        lines: [{ productId: chapati.id, quantity: "3" }],
      },
      cashier2,
    );
    await expect(
      editOwnOrder(
        bOrder.id,
        { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "1" }] },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: bOrder.id }, include: { lines: true } });
    expect(after.lines[0].quantity.toFixed(4)).toBe("3.0000");
  });

  it("G — day boundary: an order created at 23:30 Nairobi is editable; the same order after 00:30 next day is not", async () => {
    const [chapati] = ctx.products;

    // 23:30 Africa/Nairobi (UTC+3) == 20:30 UTC — today's business date.
    const todayBiz = toBusinessDate(new Date());
    const at2330 = new Date(`${todayBiz}T20:30:00.000Z`);
    // sanity: that instant is still "today" in Nairobi
    expect(toBusinessDate(at2330)).toBe(todayBiz);

    const order = await createOrder(
      {
        orderType: "dine_in",
        paymentMethod: "cash",
        occurredAt: at2330,
        lines: [{ productId: chapati.id, quantity: "4" }],
      },
      cashier,
    );

    // same-day → editable
    const edited = await editOwnOrder(
      order.id,
      { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "2" }] },
      cashier,
    );
    expect(edited.total).toBe("40.00");

    // Now backdate the order's occurredAt to yesterday's Nairobi day and
    // retry the edit — the soft "is the business day today?" gate must fail.
    const yesterdayBiz = toBusinessDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    // 12:00 UTC == 15:00 Africa/Nairobi — unambiguously still yesterday's
    // business day (unlike 21:30 UTC, which is 00:30 the next day in +03:00).
    await prisma.order.update({
      where: { id: order.id },
      data: { occurredAt: new Date(`${yesterdayBiz}T12:00:00.000Z`) },
    });
    await expect(
      editOwnOrder(
        order.id,
        { orderType: "dine_in", paymentMethod: "cash", lines: [{ productId: chapati.id, quantity: "1" }] },
        cashier,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// D — Canteen derived sales exact across a period boundary
// ─────────────────────────────────────────────────────────────────────────

describe("QA-S7 · Canteen derived sales — period-boundary arithmetic", () => {
  const SCOPE = "qa_s7_canteen";
  let ctx: CanteenTestCtx;
  let attendant: {
    userId: string;
    role: "canteen_attendant";
    locationId: string;
  };

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE, [
      { name: "Soda 300ml", sellingPrice: "60.00" },
    ]);
    attendant = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("two counts with transfers-in + production + non-sale consumption between them — second period is exact to the cent", async () => {
    const [soda] = ctx.products;
    const price = new Prisma.Decimal(soda.sellingPrice);

    // Ledger before count 1: opening 200 on Aug 20.
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "200",
      occurredAt: new Date("2026-08-20T06:00:00Z"),
    });

    // COUNT 1 — Aug 22 08:00, shelf holds 150.
    //   expectedRemaining = 200; sold_1 = 200 − 150 = 50.
    const c1 = await recordStockCount(
      { productId: soda.id, countedQuantity: "150", occurredAt: new Date("2026-08-22T08:00:00Z") },
      attendant,
    );
    expect(c1.derivedSale.unitsSold).toBe("50.0000");
    expect(c1.derivedSale.revenue).toBe(price.mul(50).toFixed(2)); // 3000.00
    expect(c1.derivedSale.periodStart).toBeNull(); // first count

    // Between count 1 and count 2:
    //   + transfer in  40  (Aug 23)
    //   + production    25  (Aug 24)
    //   − non-sale       7  (Aug 24, spoilage) — stored negative
    await seedMovement(ctx, { productId: soda.id, movementType: "transfer", quantity: "40", occurredAt: new Date("2026-08-23T09:00:00Z") });
    await seedMovement(ctx, { productId: soda.id, movementType: "production", quantity: "25", occurredAt: new Date("2026-08-24T09:00:00Z") });
    await seedMovement(ctx, { productId: soda.id, movementType: "non_sale_consumption", quantity: "-7", occurredAt: new Date("2026-08-24T10:00:00Z") });

    // COUNT 2 — Aug 25 08:00, shelf holds 96.
    //   opening (= count 1's counted) 150 + received (40 + 25) − non-sale 7 − counted 96
    //   sold_2 = 150 + 65 − 7 − 96 = 112.
    const c2 = await recordStockCount(
      { productId: soda.id, countedQuantity: "96", occurredAt: new Date("2026-08-25T08:00:00Z") },
      attendant,
    );
    expect(c2.derivedSale.unitsSold).toBe("112.0000");
    expect(c2.derivedSale.revenue).toBe(price.mul(112).toFixed(2)); // 6720.00
    expect(c2.derivedSale.periodStart).toBe(
      new Date("2026-08-22T08:00:00Z").toISOString(),
    );
    expect(c2.derivedSale.periodEnd).toBe(
      new Date("2026-08-25T08:00:00Z").toISOString(),
    );

    // The two "sold" figures don't overlap: total sold across both periods
    // is 50 + 112 = 162, and the ledger's total sale movement magnitude
    // equals that exactly.
    const saleAgg = await prisma.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { productId: soda.id, locationId: ctx.canteenId, movementType: "sale" },
    });
    expect((saleAgg._sum.quantity ?? ZERO).toFixed(4)).toBe("-162.0000");

    // Closing after count 2 = the counted value, exactly.
    const bal = await getDerivedStockBalance({ productId: soda.id, locationId: ctx.canteenId });
    expect(bal.quantity).toBe("96.0000");

    // Revenue in Cash across both counts = (50 + 112) × 60 = 9720.00, and
    // it is the only thing those canteen_sale rows put in Cash.
    const revAgg = await prisma.moneyMovement.aggregate({
      _sum: { amount: true },
      where: {
        account: "cash",
        sourceType: "canteen_sale",
        sourceId: { in: [c1.count.id, c2.count.id] },
      },
    });
    expect((revAgg._sum.amount ?? ZERO).toFixed(2)).toBe("9720.00");
  });

  it("counting MORE than the ledger accounts for across the boundary → VALIDATION_ERROR, nothing written", async () => {
    const [soda] = ctx.products;
    await seedMovement(ctx, { productId: soda.id, movementType: "opening", quantity: "100", occurredAt: new Date("2026-08-20T06:00:00Z") });
    await recordStockCount(
      { productId: soda.id, countedQuantity: "90", occurredAt: new Date("2026-08-21T08:00:00Z") },
      attendant,
    );
    // now shelf "holds" 95 but only 90 + nothing received is accounted for
    const before = await prisma.stockCount.count({ where: { productId: soda.id } });
    await expect(
      recordStockCount(
        { productId: soda.id, countedQuantity: "95", occurredAt: new Date("2026-08-22T08:00:00Z") },
        attendant,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const after = await prisma.stockCount.count({ where: { productId: soda.id } });
    expect(after).toBe(before); // nothing written
  });
});
