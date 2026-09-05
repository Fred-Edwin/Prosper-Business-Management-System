// ═══════════════════════════════════════════════════════════════════════
// The CLEAN scenario — deliberately round numbers a human can verify by
// hand, in their head, from a printed sheet.
//
// The randomised 60-day scenario proves the maths accumulates correctly,
// but its figures (125,970.00 / 223,480.00) can only be checked by
// another machine. This one exists so the OWNER can open the app, look at
// a screen, and confirm the number with a calculator — or without one.
//
// Every quantity and price here is chosen so each total is obvious:
//
//   THREE DAYS. Prices: Rice 150/kg, Stew 200/plate, Soda 60 (buy 45),
//   Water 50 (buy 35), Mandazi 20 (buy 12), Chapati 20.
//
//   DAY 1  buy 100kg rice @150      = 15,000  (cash)
//          make 50 chapati, 20 stew
//          sell 10 stew @200        =  2,000  cash
//          sell 20 chapati @20      =    400  M-Pesa
//          expense: rent            =  5,000  cash
//          → Revenue 2,400 · Expenses 5,000
//
//   DAY 2  buy 100 soda @45         =  4,500  (M-Pesa) into Canteen
//          sell 5 stew @200         =  1,000  credit (Customer A)
//          canteen: 30 soda sold @60=  1,800  (derived from the count)
//          expense: utilities       =  2,000  M-Pesa
//          → Revenue 2,800 · Expenses 2,000 · Debt 1,000
//
//   DAY 3  sell 10 chapati @20      =    200  cash
//          waste 2kg rice (spoiled) =    300  non-sale cost (2 × 150)
//          repayment from Customer A=    400  cash
//          expense: transport       =  1,000  cash
//          → Revenue 200 · Expenses 1,000 · Debt now 600
//
//   TOTALS over the three days:
//     Revenue        2,400 + 2,800 + 200   =  5,400
//     Expenses       5,000 + 2,000 + 1,000 =  8,000
//     Debts owed     1,000 − 400           =    600
//     Non-sale cost  2kg × 150             =    300
//
// Cash and COGS are asserted from the ledger rather than restated here,
// because both depend on stock still on hand — the point of this file is
// the figures a human reads off a screen.
// ═══════════════════════════════════════════════════════════════════════
import {
  api,
  actAs,
  setBusinessMoment,
  expectOk,
  LOC,
  PRODUCT,
  type Cast,
} from "./harness";
import { ShadowLedger, money, qty, stockKey } from "./shadow";

export const CLEAN_DAYS = ["2026-06-01", "2026-06-02", "2026-06-03"] as const;

/** What each screen must show. The walkthrough sheet is generated from this. */
export const EXPECTED = {
  from: CLEAN_DAYS[0],
  to: CLEAN_DAYS[2],
  revenue: "5400.00",
  totalExpenses: "8000.00",
  debtsOwedToBusiness: "600.00",
  nonSaleTotal: "300.00",
  perDay: {
    "2026-06-01": { revenue: "2400.00", expenses: "5000.00" },
    "2026-06-02": { revenue: "2800.00", expenses: "2000.00" },
    "2026-06-03": { revenue: "200.00", expenses: "1000.00" },
  },
  perLocation: {
    // Restaurant: 2,000 + 400 + 1,000 + 200 = 3,600
    restaurant: "3600.00",
    // Canteen: the derived soda sale
    canteen: "1800.00",
  },
} as const;

export async function runCleanScenario(cast: Cast): Promise<ShadowLedger> {
  const shadow = new ShadowLedger();
  const [D1, D2, D3] = CLEAN_DAYS;
  const add = (day: string, p: string, l: string, d: bigint) =>
    shadow.addStock(day, stockKey(p, l), d);

  // ── DAY 1 ────────────────────────────────────────────────────────────
  setBusinessMoment(D1, "07:00");
  actAs(cast.admin);

  // Opening stock so the Restaurant/Canteen have something to sell.
  // Only non-zero openings — the API rejects an opening of 0 ("Quantity
  // must be greater than zero"), and rice/canteen-soda start empty anyway:
  // their balance is established by the purchases below.
  const OPENING: Array<[string, string, string]> = [
    [PRODUCT.water, LOC.canteen, "50"],
    [PRODUCT.mandazi, LOC.canteen, "50"],
    [PRODUCT.soda, LOC.restaurant, "20"],
    [PRODUCT.water, LOC.restaurant, "20"],
  ];
  for (const [productId, locationId, quantity] of OPENING) {
    expectOk(
      `opening ${productId}`,
      await api.createMovement({
        movementType: "opening",
        productId,
        locationId,
        businessDate: D1,
        quantity,
      }),
    );
    add(D1, productId, locationId, qty(quantity));
  }

  const customer = expectOk(
    "customer",
    await api.createCustomer({ name: "Demo Customer A", phone: "0711000111" }),
  );

  // buy 100kg rice @150 = 15,000 cash
  setBusinessMoment(D1, "08:00");
  actAs(cast.admin);
  const ricePay = expectOk(
    "rice payment",
    await api.createMovement({
      movementType: "purchase_payment",
      productId: PRODUCT.rice,
      locationId: LOC.store,
      supplier: "Demo Supplier",
      quantity: "100",
      cost: "15000.00",
      paidFromAccount: "cash",
    }),
  );
  shadow.addCash(D1, -money("15000.00"));

  setBusinessMoment(D1, "08:30");
  actAs(cast.storeManager);
  expectOk(
    "rice receipt",
    await api.createMovement({
      movementType: "purchase_receipt",
      productId: PRODUCT.rice,
      locationId: LOC.store,
      quantity: "100",
      purchasePaymentId: ricePay.id,
    }),
  );
  add(D1, PRODUCT.rice, LOC.store, qty("100"));
  shadow.addPurchaseValue(D1, LOC.store, money("15000.00"));

  // make 50 chapati + 20 stew
  setBusinessMoment(D1, "10:00");
  actAs(cast.storeManager);
  for (const [dish, made] of [
    [PRODUCT.chapati, "50"],
    [PRODUCT.stew, "20"],
  ] as const) {
    expectOk(
      `production ${dish}`,
      await api.createMovement({
        movementType: "production",
        productId: dish,
        locationId: LOC.restaurant,
        quantity: made,
      }),
    );
    add(D1, dish, LOC.restaurant, qty(made));
  }

  // sell 10 stew @200 = 2,000 cash
  setBusinessMoment(D1, "12:00");
  actAs(cast.cashier);
  expectOk(
    "stew order",
    await api.createOrder({
      orderType: "dine_in",
      paymentMethod: "cash",
      account: "cash",
      lines: [{ productId: PRODUCT.stew, quantity: "10" }],
    }),
  );
  shadow.addRevenue(D1, LOC.restaurant, money("2000.00"));
  shadow.addCash(D1, money("2000.00"));
  add(D1, PRODUCT.stew, LOC.restaurant, -qty("10"));

  // sell 20 chapati @20 = 400 M-Pesa
  setBusinessMoment(D1, "13:00");
  expectOk(
    "chapati order",
    await api.createOrder({
      orderType: "takeaway",
      paymentMethod: "mpesa",
      account: "mpesa_bank",
      lines: [{ productId: PRODUCT.chapati, quantity: "20" }],
    }),
  );
  shadow.addRevenue(D1, LOC.restaurant, money("400.00"));
  shadow.addMpesa(D1, money("400.00"));
  add(D1, PRODUCT.chapati, LOC.restaurant, -qty("20"));

  // rent 5,000 cash
  setBusinessMoment(D1, "19:00");
  actAs(cast.admin);
  expectOk(
    "rent",
    await api.recordExpense({
      category: "rent",
      amount: "5000.00",
      date: D1,
      paidFromAccount: "cash",
    }),
  );
  shadow.addExpense(D1, money("5000.00"));
  shadow.addCash(D1, -money("5000.00"));

  // ── DAY 2 ────────────────────────────────────────────────────────────
  // buy 100 soda @45 = 4,500 M-Pesa, into the Canteen
  setBusinessMoment(D2, "08:00");
  actAs(cast.admin);
  const sodaPay = expectOk(
    "soda payment",
    await api.createMovement({
      movementType: "purchase_payment",
      productId: PRODUCT.soda,
      locationId: LOC.canteen,
      supplier: "Demo Supplier",
      quantity: "100",
      cost: "4500.00",
      paidFromAccount: "mpesa_bank",
    }),
  );
  shadow.addMpesa(D2, -money("4500.00"));

  setBusinessMoment(D2, "08:30");
  actAs(cast.canteen);
  expectOk(
    "soda receipt",
    await api.createMovement({
      movementType: "purchase_receipt",
      productId: PRODUCT.soda,
      locationId: LOC.canteen,
      quantity: "100",
      purchasePaymentId: sodaPay.id,
    }),
  );
  add(D2, PRODUCT.soda, LOC.canteen, qty("100"));
  shadow.addPurchaseValue(D2, LOC.canteen, money("4500.00"));

  // sell 5 stew @200 = 1,000 on CREDIT
  setBusinessMoment(D2, "12:00");
  actAs(cast.cashier);
  expectOk(
    "credit order",
    await api.createOrder({
      orderType: "dine_in",
      paymentMethod: "credit",
      customerId: customer.id,
      lines: [{ productId: PRODUCT.stew, quantity: "5" }],
    }),
  );
  shadow.addRevenue(D2, LOC.restaurant, money("1000.00"));
  shadow.addDebt(D2, money("1000.00"));
  add(D2, PRODUCT.stew, LOC.restaurant, -qty("5"));

  // canteen: 30 soda sold @60 = 1,800 — DERIVED from the count.
  // 100 on hand, count 70 remaining ⇒ system derives 30 sold.
  setBusinessMoment(D2, "17:00");
  actAs(cast.canteen);
  const count = expectOk(
    "soda count",
    await api.recordStockCount({
      productId: PRODUCT.soda,
      countedQuantity: "70",
    }),
  );
  const ds = count.derivedSale;
  if (!ds || ds.revenue == null) throw new Error("no derivedSale on soda count");
  if (ds.revenue !== "1800.00") {
    throw new Error(`soda derived sale expected 1800.00, got ${ds.revenue}`);
  }
  shadow.addRevenue(D2, LOC.canteen, money("1800.00"));
  shadow.addCash(D2, money("1800.00"));
  add(D2, PRODUCT.soda, LOC.canteen, -qty("30"));

  // utilities 2,000 M-Pesa
  setBusinessMoment(D2, "19:00");
  actAs(cast.admin);
  expectOk(
    "utilities",
    await api.recordExpense({
      category: "utilities",
      amount: "2000.00",
      date: D2,
      paidFromAccount: "mpesa_bank",
    }),
  );
  shadow.addExpense(D2, money("2000.00"));
  shadow.addMpesa(D2, -money("2000.00"));

  // ── DAY 3 ────────────────────────────────────────────────────────────
  // sell 10 chapati @20 = 200 cash
  setBusinessMoment(D3, "12:00");
  actAs(cast.cashier);
  expectOk(
    "chapati order d3",
    await api.createOrder({
      orderType: "dine_in",
      paymentMethod: "cash",
      account: "cash",
      lines: [{ productId: PRODUCT.chapati, quantity: "10" }],
    }),
  );
  shadow.addRevenue(D3, LOC.restaurant, money("200.00"));
  shadow.addCash(D3, money("200.00"));
  add(D3, PRODUCT.chapati, LOC.restaurant, -qty("10"));

  // waste 2kg rice (spoiled) → non-sale cost 2 × 150 = 300
  setBusinessMoment(D3, "16:00");
  actAs(cast.storeManager);
  expectOk(
    "rice waste",
    await api.createMovement({
      movementType: "non_sale_consumption",
      productId: PRODUCT.rice,
      locationId: LOC.store,
      quantity: "2",
      reason: "spoiled",
    }),
  );
  add(D3, PRODUCT.rice, LOC.store, -qty("2"));

  // repayment 400 cash
  setBusinessMoment(D3, "18:00");
  actAs(cast.admin);
  expectOk(
    "repayment",
    await api.recordRepayment(customer.id, {
      amount: "400.00",
      account: "cash",
      date: D3,
    }),
  );
  shadow.addDebt(D3, -money("400.00"));
  shadow.addCash(D3, money("400.00"));

  // transport 1,000 cash
  setBusinessMoment(D3, "19:00");
  expectOk(
    "transport",
    await api.recordExpense({
      category: "transport",
      amount: "1000.00",
      date: D3,
      paidFromAccount: "cash",
    }),
  );
  shadow.addExpense(D3, money("1000.00"));
  shadow.addCash(D3, -money("1000.00"));

  return shadow;
}
