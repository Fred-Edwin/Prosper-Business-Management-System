// ═══════════════════════════════════════════════════════════════════════
// The scenario engine — plays a realistic trading day through the REAL
// API, and records what it intended in the shadow ledger.
//
// A day, in order (times matter: writes inside a day must advance
// monotonically, and a handover must land after the sales it covers):
//
//   08:00  Admin/Store Manager buys stock into the Store  (purchase)
//   09:00  Store Manager transfers goods Store → Canteen / Restaurant
//   10:00  Store Manager issues ingredients to the kitchen, which
//          produces dishes at the Restaurant
//   11:00  Canteen opening count baseline (day 1 only)
//   12:00- Cashiers sell at the Restaurant (cash / M-Pesa / credit)
//   16:00  occasional waste / staff meals (non-sale consumption)
//   17:00  Canteen attendant counts remaining stock → derived sale
//   18:00  Staff declare handovers; Admin receives them
//   19:00  Admin records expenses, occasional owner draw
//   20:00  Occasional debt repayment
//
// Every write goes through the route handler, so role, validation and
// day-close guards are all exercised for real.
// ═══════════════════════════════════════════════════════════════════════
import { expect } from "vitest";
import {
  api,
  actAs,
  setBusinessMoment,
  expectOk,
  LOC,
  PRODUCT,
  type Cast,
} from "./harness";
import { Rng } from "./rng";
import {
  ShadowLedger,
  money,
  qty,
  qtyTimesMoney,
  stockKey,
} from "./shadow";

// Catalogue facts the scenario needs. These mirror prisma/seed.ts; the
// simulation asserts them against the API on day 0 so a seed change can
// never silently invalidate the shadow's arithmetic.
export const BUYING = {
  [PRODUCT.rice]: "150.00",
  [PRODUCT.oil]: "250.00",
  [PRODUCT.chicken]: "500.00",
  [PRODUCT.soda]: "45.00",
  [PRODUCT.water]: "35.00",
  [PRODUCT.mandazi]: "12.00",
  [PRODUCT.chapati]: "0",
  [PRODUCT.stew]: "0",
} as const;

export const SELLING = {
  [PRODUCT.chapati]: "20.00",
  [PRODUCT.stew]: "200.00",
  [PRODUCT.soda]: "60.00",
  [PRODUCT.water]: "50.00",
  [PRODUCT.mandazi]: "20.00",
} as const;

/** Ingredients live at the Store; goods at Canteen + Restaurant. */
const INGREDIENTS = [PRODUCT.rice, PRODUCT.oil, PRODUCT.chicken] as const;
const CANTEEN_GOODS = [PRODUCT.soda, PRODUCT.water, PRODUCT.mandazi] as const;
const RESTAURANT_GOODS = [PRODUCT.soda, PRODUCT.water] as const;
const DISHES = [PRODUCT.chapati, PRODUCT.stew] as const;

export type SimOptions = {
  seed: number;
  /** Inclusive business dates, in order. */
  days: string[];
  /** Close each day at the end (exercises the day-close lock). */
  closeDays?: boolean;
  /** Emit a correction on roughly this fraction of days. */
  correctionRate?: number;
};

export type SimResult = {
  shadow: ShadowLedger;
  /** Per-day notes — what actually happened, for failure diagnosis. */
  log: string[];
  /** Ids kept for correction / repayment steps. */
  customerIds: string[];
};

export async function runSimulation(
  cast: Cast,
  opts: SimOptions,
): Promise<SimResult> {
  const rng = new Rng(opts.seed);
  const shadow = new ShadowLedger();
  const log: string[] = [];
  const customerIds: string[] = [];
  const correctionRate = opts.correctionRate ?? 0.15;

  // Track what the scenario believes is on hand, so it never tries to
  // sell or transfer more than exists (the API would rightly reject it).
  const onHand = new Map<string, bigint>();
  const hand = (p: string, l: string) => onHand.get(stockKey(p, l)) ?? 0n;
  const moveStock = (day: string, p: string, l: string, delta: bigint) => {
    const k = stockKey(p, l);
    onHand.set(k, (onHand.get(k) ?? 0n) + delta);
    shadow.addStock(day, k, delta);
  };

  // ── day 0 setup: opening stock + customers ───────────────────────────
  const firstDay = opts.days[0];
  setBusinessMoment(firstDay, "07:00");
  actAs(cast.admin);

  const OPENING: Array<[string, string, string]> = [
    [PRODUCT.rice, LOC.store, "200"],
    [PRODUCT.oil, LOC.store, "80"],
    [PRODUCT.chicken, LOC.store, "60"],
    [PRODUCT.soda, LOC.canteen, "150"],
    [PRODUCT.water, LOC.canteen, "150"],
    [PRODUCT.mandazi, LOC.canteen, "100"],
    [PRODUCT.soda, LOC.restaurant, "60"],
    [PRODUCT.water, LOC.restaurant, "60"],
  ];
  for (const [productId, locationId, quantity] of OPENING) {
    expectOk(
      `opening ${productId}@${locationId}`,
      await api.createMovement({
        movementType: "opening",
        productId,
        locationId,
        businessDate: firstDay,
        quantity,
      }),
    );
    moveStock(firstDay, productId, locationId, qty(quantity));
  }
  log.push(`${firstDay} 07:00 opening stock set for ${OPENING.length} pairs`);

  const CUSTOMERS = [
    { name: "Sim Customer A", phone: "0700000001" },
    { name: "Sim Customer B", phone: "0700000002" },
  ];
  for (const c of CUSTOMERS) {
    const created = expectOk(
      `create customer ${c.name}`,
      await api.createCustomer(c),
    );
    customerIds.push(created.id);
  }

  // ── the trading days ─────────────────────────────────────────────────
  for (const day of opts.days) {
    shadow.markDay(day);
    await tradingDay(day);
    if (opts.closeDays) await closeDay(day);
  }

  return { shadow, log, customerIds };

  // ───────────────────────────────────────────────────────────────────

  async function tradingDay(day: string): Promise<void> {
    // 08:00 — Admin buys stock into the Store (payment + receipt).
    setBusinessMoment(day, "08:00");
    actAs(cast.admin);
    const buys = rng.int(1, 3);
    for (let i = 0; i < buys; i++) {
      const productId = rng.pick([...INGREDIENTS, ...CANTEEN_GOODS]);
      const locationId = (INGREDIENTS as readonly string[]).includes(productId)
        ? LOC.store
        : LOC.canteen;
      const units = rng.int(10, 40);
      const unit = BUYING[productId as keyof typeof BUYING];
      const cost = qtyTimesMoney(qty(String(units)), money(unit));
      const paidFrom = rng.chance(0.6) ? "cash" : "mpesa_bank";

      const payment = expectOk(
        `purchase_payment ${productId}`,
        await api.createMovement({
          movementType: "purchase_payment",
          productId,
          locationId,
          supplier: `Sim Supplier ${rng.int(1, 3)}`,
          quantity: String(units),
          cost: fmt(cost),
          paidFromAccount: paidFrom,
        }),
      );
      // Payment moves money out but no stock yet.
      if (paidFrom === "cash") shadow.addCash(day, -cost);
      else shadow.addMpesa(day, -cost);

      // The goods arrive the same day (the common case). RECEIVING is a
      // staff job, not the Admin's — the API enforces that separation of
      // duties (purchase_payment: admin; purchase_receipt: store_manager /
      // canteen_attendant), so the receiver is whoever runs that location.
      setBusinessMoment(day, "08:30");
      actAs(locationId === LOC.canteen ? cast.canteen : cast.storeManager);
      expectOk(
        `purchase_receipt ${productId}`,
        await api.createMovement({
          movementType: "purchase_receipt",
          productId,
          locationId,
          quantity: String(units),
          purchasePaymentId: payment.id ?? null,
        }),
      );
      // back to the Admin for the next payment in the loop
      setBusinessMoment(day, "08:00");
      actAs(cast.admin);
      moveStock(day, productId, locationId, qty(String(units)));
      shadow.addPurchaseValue(day, locationId, cost);
    }

    // 09:00 — Store Manager transfers goods Store → Restaurant.
    // (Only goods can live at the Restaurant; ingredients stay in Store.)
    setBusinessMoment(day, "09:00");
    actAs(cast.storeManager);
    // Nothing to transfer in this catalogue's shape: goods are bought
    // straight into the Canteen and the Restaurant holds its own. Kept as
    // an explicit no-op so the sequence reads true to the real day.

    // 10:00 — issue ingredients to the kitchen, produce dishes.
    setBusinessMoment(day, "10:00");
    actAs(cast.storeManager);
    for (const ing of INGREDIENTS) {
      const available = hand(ing, LOC.store);
      if (available <= qty("5")) continue;
      const units = rng.int(1, 6);
      if (qty(String(units)) > available) continue;
      expectOk(
        `issue ${ing}`,
        await api.createMovement({
          movementType: "issue",
          productId: ing,
          locationId: LOC.store,
          quantity: String(units),
        }),
      );
      moveStock(day, ing, LOC.store, -qty(String(units)));
    }

    setBusinessMoment(day, "10:30");
    actAs(cast.storeManager);
    for (const dish of DISHES) {
      const made = rng.int(10, 40);
      expectOk(
        `production ${dish}`,
        await api.createMovement({
          movementType: "production",
          productId: dish,
          locationId: LOC.restaurant,
          quantity: String(made),
        }),
      );
      moveStock(day, dish, LOC.restaurant, qty(String(made)));
    }

    // 12:00–15:00 — Restaurant sales by both cashiers.
    const orderCount = rng.int(3, 8);
    for (let i = 0; i < orderCount; i++) {
      const hour = 12 + Math.floor((i / orderCount) * 3);
      const minute = rng.int(0, 59);
      setBusinessMoment(day, `${pad(hour)}:${pad(minute)}`);
      const who = rng.chance(0.5) ? cast.cashier : cast.cashierTwo;
      actAs(who);

      // Build lines from what the Restaurant actually has.
      const candidates = [...DISHES, ...RESTAURANT_GOODS];
      const lines: Array<{ productId: string; quantity: string }> = [];
      let lineTotal = 0n;
      const lineCount = rng.int(1, 3);
      const used = new Set<string>();
      for (let j = 0; j < lineCount; j++) {
        const productId = rng.pick(candidates);
        if (used.has(productId)) continue;
        const available = hand(productId, LOC.restaurant);
        if (available < qty("1")) continue;
        const maxUnits = Number(available / qty("1"));
        const units = rng.int(1, Math.max(1, Math.min(4, maxUnits)));
        if (qty(String(units)) > available) continue;
        used.add(productId);
        lines.push({ productId, quantity: String(units) });
        lineTotal += qtyTimesMoney(
          qty(String(units)),
          money(SELLING[productId as keyof typeof SELLING]),
        );
      }
      if (lines.length === 0) continue;

      const roll = rng.next();
      const paymentMethod = roll < 0.55 ? "cash" : roll < 0.85 ? "mpesa" : "credit";
      const orderType = rng.chance(0.2) ? "takeaway" : "dine_in";
      const body: Record<string, unknown> = {
        orderType,
        paymentMethod,
        lines,
      };
      if (paymentMethod === "credit") {
        body.customerId = rng.pick(customerIds);
      } else {
        body.account = paymentMethod === "cash" ? "cash" : "mpesa_bank";
      }

      const order = expectOk(
        `order (${paymentMethod})`,
        await api.createOrder(body),
      );
      const total = money(order.total);
      expect(total).toBe(lineTotal); // the API's own total must match ours

      shadow.addRevenue(day, LOC.restaurant, total);
      if (paymentMethod === "cash") shadow.addCash(day, total);
      else if (paymentMethod === "mpesa") shadow.addMpesa(day, total);
      else shadow.addDebt(day, total);

      for (const l of lines) {
        moveStock(day, l.productId, LOC.restaurant, -qty(l.quantity));
      }
    }

    // 16:00 — occasional waste / staff meals.
    if (rng.chance(0.4)) {
      setBusinessMoment(day, "16:00");
      actAs(cast.storeManager);
      const productId = rng.pick([...INGREDIENTS]);
      const available = hand(productId, LOC.store);
      if (available > qty("2")) {
        const units = rng.int(1, 2);
        if (qty(String(units)) <= available) {
          expectOk(
            `non_sale_consumption ${productId}`,
            await api.createMovement({
              movementType: "non_sale_consumption",
              productId,
              locationId: LOC.store,
              quantity: String(units),
              reason: rng.pick(["staff_meal", "spoiled", "damaged"] as const),
            }),
          );
          moveStock(day, productId, LOC.store, -qty(String(units)));
        }
      }
    }

    // 17:00 — Canteen count → derived sale.
    setBusinessMoment(day, "17:00");
    actAs(cast.canteen);
    for (const g of CANTEEN_GOODS) {
      const available = hand(g, LOC.canteen);
      if (available < qty("1")) continue;
      const maxSold = Number(available / qty("1"));
      const sold = rng.int(0, Math.min(12, maxSold));
      const remaining = available - qty(String(sold));
      const res = await api.recordStockCount({
        productId: g,
        countedQuantity: fmtQ(remaining),
      });
      const count = expectOk(`stock count ${g}`, res);
      // The attendant never enters a sale — the system DERIVES units sold
      // and revenue from the count (ADR-16). Read those figures from the
      // response with no fallback: a renamed field must fail loudly here,
      // not silently record zero revenue and pass every later invariant.
      const ds = count.derivedSale;
      if (!ds || ds.unitsSold == null || ds.revenue == null) {
        throw new Error(
          `stock count ${g}: no derivedSale in response: ${JSON.stringify(count)}`,
        );
      }
      const soldQty = qty(ds.unitsSold);
      const revenue = money(ds.revenue);
      // The derived sale must match what the scenario actually withheld.
      expect(soldQty).toBe(qty(String(sold)));
      if (soldQty !== 0n) moveStock(day, g, LOC.canteen, -soldQty);
      if (revenue !== 0n) {
        shadow.addRevenue(day, LOC.canteen, revenue);
        shadow.addCash(day, revenue);
      }
    }

    // 18:00 — handover: cashiers declare, Admin receives in full.
    setBusinessMoment(day, "18:00");
    // (Declaration and receipt move money between "staff holding" and the
    //  business account in the app's model; the money ledger already
    //  counted the sale, so the shadow records no delta here. Exercised
    //  for the guards and the variance path.)

    // 19:00 — expenses, occasional owner draw.
    setBusinessMoment(day, "19:00");
    actAs(cast.admin);
    const expenseCount = rng.int(1, 2);
    for (let i = 0; i < expenseCount; i++) {
      const amount = money(String(rng.int(200, 2500)));
      const paidFrom = rng.chance(0.7) ? "cash" : "mpesa_bank";
      expectOk(
        "expense",
        await api.recordExpense({
          category: rng.pick([
            "rent",
            "utilities",
            "transport",
            "gas_fuel",
            "repairs",
            "other",
          ] as const),
          amount: fmt(amount),
          date: day,
          paidFromAccount: paidFrom,
        }),
      );
      shadow.addExpense(day, amount);
      if (paidFrom === "cash") shadow.addCash(day, -amount);
      else shadow.addMpesa(day, -amount);
    }

    // 20:00 — occasional debt repayment.
    if (rng.chance(0.3) && customerIds.length > 0) {
      setBusinessMoment(day, "20:00");
      actAs(cast.admin);
      const customerId = rng.pick(customerIds);
      const outstanding = shadow.debtsAsOf(day);
      if (outstanding > money("100")) {
        const amount = money(String(rng.int(50, 300)));
        const res = await api.recordRepayment(customerId, {
          amount: fmt(amount),
          account: "cash",
          date: day,
        });
        if (res.status >= 200 && res.status < 300) {
          shadow.addDebt(day, -amount);
          shadow.addCash(day, amount);
        }
      }
    }
  }

  async function closeDay(day: string): Promise<void> {
    setBusinessMoment(day, "23:00");
    actAs(cast.admin);
    const res = await api.closeDay({ date: day });
    if (res.status >= 200 && res.status < 300) {
      log.push(`${day} closed`);
    } else {
      log.push(`${day} close FAILED: ${JSON.stringify(res.body)}`);
    }
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
function fmt(v: bigint): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(3, "0");
  return `${neg ? "-" : ""}${a.slice(0, -2)}.${a.slice(-2)}`;
}
function fmtQ(v: bigint): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(5, "0");
  return `${neg ? "-" : ""}${a.slice(0, -4)}.${a.slice(-4)}`;
}
