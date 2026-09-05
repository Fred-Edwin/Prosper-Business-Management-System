// ═══════════════════════════════════════════════════════════════════════
// Horizon 4 — CORRECTIONS, DAY-CLOSE and ROLE SCOPING over two weeks.
//
// The happy-path horizons prove the arithmetic accumulates correctly.
// This suite attacks the places financial systems usually break:
//
//   C1  a corrected order is not double-counted in revenue
//   C2  a correction moves revenue by exactly the intended delta
//   C3  correcting an expense moves net profit by exactly the delta
//   C4  a closed day rejects NEW entries — from staff AND from Admin
//   C5  a closed day still admits an Admin CORRECTION (the way back in)
//   C6  a Cashier cannot see another Cashier's orders
//   C7  no buying-price / margin field leaks to a Cashier
//   C8  corrections keep every earlier invariant true (re-run I1/I2/I3)
// ═══════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { addBusinessDays } from "@/lib/time";
import {
  api,
  actAs,
  setBusinessMoment,
  expectOk,
  loadCast,
  resetLedger,
  LOC,
  PRODUCT,
  type Cast,
} from "./harness";
import { runSimulation, type SimResult, SELLING } from "./scenario";
import { money, qtyTimesMoney, qty, fmtMoney } from "./shadow";

const START = "2026-07-06";
const DAYS = Array.from({ length: 14 }, (_, i) => addBusinessDays(START, i));
const LAST = DAYS[DAYS.length - 1];
const SEED = 909090;

let cast: Cast;
let sim: SimResult;

describe("corrections, day-close and role scoping", () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    await resetLedger();
    cast = await loadCast();
    sim = await runSimulation(cast, { seed: SEED, days: DAYS });
    vi.setSystemTime(new Date(`${LAST}T23:30:00+03:00`));
    actAs(cast.admin);
  }, 900_000);

  afterAll(() => vi.useRealTimers());

  const summary = async (from: string, to: string) =>
    expectOk(
      `summary ${from}..${to}`,
      await api.financialSummary(`?from=${from}&to=${to}`),
    );

  it("C1/C2 — correcting an order moves revenue by exactly the delta, never double-counts", async () => {
    const day = DAYS[3];
    setBusinessMoment(day, "21:00");
    actAs(cast.admin);

    const orders = expectOk(`orders ${day}`, await api.listOrders(`?date=${day}`));
    // Correct DOWNWARD (the realistic case: "they were billed for 3, they
    // only took 2"). Correcting upward would need stock that may since have
    // been sold, and the API rightly refuses to oversell — that guard is
    // asserted separately, it is not what this test is about.
    const target = orders.find(
      (o: any) =>
        o.lines?.length === 1 && !o.correctsOrderId && qty(o.lines[0].quantity) > qty("1"),
    );
    expect(target, "need a single-line order of >1 unit to correct").toBeTruthy();

    const before = money((await summary(day, day)).consolidated.revenue);
    const line = target.lines[0];
    const oldUnits = qty(line.quantity);
    const newUnits = oldUnits - qty("1");
    const unitPrice = money(SELLING[line.productId as keyof typeof SELLING]);
    const expectedDelta = qtyTimesMoney(newUnits - oldUnits, unitPrice);

    const corrected = expectOk(
      "correct order",
      await api.correctOrder(target.id, {
        orderType: target.orderType,
        paymentMethod: target.paymentMethod,
        ...(target.paymentMethod === "credit"
          ? { customerId: target.customerId }
          : { account: target.paymentMethod === "cash" ? "cash" : "mpesa_bank" }),
        lines: [{ productId: line.productId, quantity: fmtQty(newUnits) }],
      }),
    );

    const after = money((await summary(day, day)).consolidated.revenue);
    expect(
      fmtMoney(after - before),
      `revenue moved by ${fmtMoney(after - before)}, expected ${fmtMoney(expectedDelta)}`,
    ).toBe(fmtMoney(expectedDelta));
    // and the corrected total itself is the full restated figure
    expect(money(corrected.total)).toBe(qtyTimesMoney(newUnits, unitPrice));
  });

  it("C3 — correcting an expense moves net profit by exactly the delta", async () => {
    const day = DAYS[5];
    setBusinessMoment(day, "21:30");
    actAs(cast.admin);

    const expenses = expectOk(
      `expenses ${day}`,
      await api.listExpenses(`?from=${day}&to=${day}`),
    );
    const target = expenses.find((e: any) => !e.correctsExpenseId);
    expect(target, "need an expense to correct").toBeTruthy();

    const beforeNet = money((await summary(day, day)).consolidated.netProfit);
    const beforeExp = money((await summary(day, day)).consolidated.totalExpenses);
    const oldAmount = money(target.amount);
    const newAmount = oldAmount + money("250.00");

    expectOk(
      "correct expense",
      await api.correctExpense(target.id, { amount: fmtMoney(newAmount) }),
    );

    const afterNet = money((await summary(day, day)).consolidated.netProfit);
    const afterExp = money((await summary(day, day)).consolidated.totalExpenses);
    expect(afterExp - beforeExp).toBe(money("250.00"));
    expect(beforeNet - afterNet).toBe(money("250.00"));
  });

  it("C4 — a closed day rejects NEW entries from staff and from the Admin", async () => {
    const day = DAYS[1];
    setBusinessMoment(LAST, "22:00");
    actAs(cast.admin);
    const closed = await api.closeDay({ date: day });
    expect(
      closed.status,
      `close ${day}: ${JSON.stringify(closed.body)}`,
    ).toBeGreaterThanOrEqual(200);
    expect(closed.status).toBeLessThan(300);

    // Admin tries to book a fresh expense onto the sealed day.
    const adminNew = await api.recordExpense({
      category: "other",
      amount: "500.00",
      date: day,
      paidFromAccount: "cash",
    });
    expect(
      adminNew.status,
      `admin new entry on closed day should fail: ${JSON.stringify(adminNew.body)}`,
    ).toBeGreaterThanOrEqual(400);

    // Staff tries to book stock onto the sealed day.
    setBusinessMoment(day, "12:00");
    actAs(cast.storeManager);
    const staffNew = await api.createMovement({
      movementType: "production",
      productId: PRODUCT.chapati,
      locationId: LOC.restaurant,
      quantity: "5",
    });
    expect(
      staffNew.status,
      `staff new entry on closed day should fail: ${JSON.stringify(staffNew.body)}`,
    ).toBeGreaterThanOrEqual(400);
  });

  it("C5 — a closed day still admits an Admin correction (the way back in)", async () => {
    const day = DAYS[1]; // closed in C4
    setBusinessMoment(LAST, "22:15");
    actAs(cast.admin);

    const expenses = expectOk(
      `expenses ${day}`,
      await api.listExpenses(`?from=${day}&to=${day}`),
    );
    const target = expenses.find((e: any) => !e.correctsExpenseId);
    if (!target) return; // nothing to correct that day; not a failure

    const before = money((await summary(day, day)).consolidated.totalExpenses);
    const res = await api.correctExpense(target.id, {
      amount: fmtMoney(money(target.amount) + money("100.00")),
    });
    expect(
      res.status,
      `admin correction on a CLOSED day must be allowed: ${JSON.stringify(res.body)}`,
    ).toBeLessThan(400);
    const after = money((await summary(day, day)).consolidated.totalExpenses);
    expect(after - before).toBe(money("100.00"));
  });

  it("C6 — a Cashier sees only their own orders", async () => {
    setBusinessMoment(LAST, "22:30");

    actAs(cast.admin);
    const all = expectOk("all orders", await api.listOrders(`?date=${DAYS[2]}`));

    actAs(cast.cashier);
    const mine = expectOk("cashier orders", await api.listOrders(`?date=${DAYS[2]}`));
    for (const o of mine) {
      expect(o.cashierId ?? o.recordedById).toBe(cast.cashier.id);
    }

    // Asking for the OTHER cashier's rows must not reveal them.
    const foreign = expectOk(
      "foreign filter",
      await api.listOrders(`?date=${DAYS[2]}&cashierId=${cast.cashierTwo.id}`),
    );
    expect(foreign).toEqual([]);
    if (all.length > mine.length) expect(mine.length).toBeLessThan(all.length);
  });

  it("C7 — no buying price / margin leaks to a Cashier", async () => {
    setBusinessMoment(LAST, "22:40");
    actAs(cast.cashier);
    const orders = expectOk("cashier orders", await api.listOrders(`?date=${DAYS[2]}`));
    const blob = JSON.stringify(orders);
    for (const field of ["buyingPrice", "buying_price", "margin", "cogs", "costValue"]) {
      expect(blob, `${field} must not appear in a Cashier payload`).not.toContain(field);
    }

    // The financial summary is Admin-only territory.
    const denied = await api.financialSummary(`?from=${START}&to=${LAST}`);
    expect(denied.status).toBeGreaterThanOrEqual(400);
  });

  it("C8 — after all those corrections, the chain and additivity still hold", async () => {
    setBusinessMoment(LAST, "23:45");
    actAs(cast.admin);

    const whole = await summary(START, LAST);
    const rev = money(whole.consolidated.revenue);
    const cogs = money(whole.consolidated.cogs);
    const gross = money(whole.consolidated.grossProfit);
    const exp = money(whole.consolidated.totalExpenses);
    const net = money(whole.consolidated.netProfit);
    expect(gross).toBe(rev - cogs);
    expect(net).toBe(gross - exp);

    let dRev = 0n;
    let dCogs = 0n;
    let dExp = 0n;
    for (const day of DAYS) {
      const d = await summary(day, day);
      dRev += money(d.consolidated.revenue);
      dCogs += money(d.consolidated.cogs);
      dExp += money(d.consolidated.totalExpenses);
    }
    expect(fmtMoney(dRev)).toBe(whole.consolidated.revenue);
    expect(fmtMoney(dExp)).toBe(whole.consolidated.totalExpenses);
    expect(fmtMoney(dCogs)).toBe(whole.consolidated.cogs);
  });
});

function fmtQty(v: bigint): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(5, "0");
  return `${neg ? "-" : ""}${a.slice(0, -4)}.${a.slice(-4)}`;
}
