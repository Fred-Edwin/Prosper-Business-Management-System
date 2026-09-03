import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFinancialSummary, recordExpense } from "@/lib/domain/financials";
import { dailyNetSeries } from "./trend-series";

/**
 * THE AGREEMENT GUARANTEE (M5 S13, task 2).
 *
 * `dailyNetSeries` computes net profit per day WITHOUT running a full
 * stock-valuation sweep per day (ADR-64 — the opening/closing terms
 * telescope, so one day's COGS only needs that day's movements). The one
 * correctness risk is that the fast path disagrees with the Financials
 * screen. This suite stands up five consecutive business days STRADDLING
 * A MONTH BOUNDARY (2024-08-29 … 2024-09-02) — orders, canteen sales,
 * purchases, transfers, non-sale consumption, expenses, a superseded
 * order — then asserts, day by day, that
 *
 *     dailyNetSeries(from, to)[i].net
 *       === getFinancialSummary(day, day).consolidated.netProfit
 *
 * to the cent. If they diverge, the fast path is wrong: fix it, do not
 * adjust the test.
 *
 * Scope: rows namespaced with `PREFIX`. Opening stock is dated
 * 2024-08-01 (well before the window).
 */

const PREFIX = "__trend_series_agree__";
const d = (iso: string) => new Date(iso);
const OPENING_AT = d("2024-08-01T05:00:00Z");
/** An instant inside a given Africa/Nairobi business date, at hour `h`. */
const on = (date: string, h: number) =>
  d(`${date}T${String(h).padStart(2, "0")}:00:00+03:00`);

const DAYS = [
  "2024-08-29",
  "2024-08-30",
  "2024-08-31",
  "2024-09-01",
  "2024-09-02",
] as const;

const money = (v: string) => Number(v);

describe("dailyNetSeries agrees with getFinancialSummary per day (month boundary)", () => {
  let adminId: string;
  let restaurantId: string;
  let canteenId: string;
  let storeId: string;
  let ingredientId: string;
  let goodsId: string;
  let dishId: string;
  let supersededOrderId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    adminId = admin.id;

    const [restaurant, canteen, store] = await Promise.all([
      prisma.location.create({ data: { name: `${PREFIX} Restaurant`, type: "restaurant" } }),
      prisma.location.create({ data: { name: `${PREFIX} Canteen`, type: "canteen" } }),
      prisma.location.create({ data: { name: `${PREFIX} Store`, type: "store" } }),
    ]);
    restaurantId = restaurant.id;
    canteenId = canteen.id;
    storeId = store.id;

    const [ingredient, goods, dish] = await Promise.all([
      prisma.product.create({
        data: { name: `${PREFIX} Flour`, kind: "ingredient", unitLabel: "kg", buyingPrice: 100 },
      }),
      prisma.product.create({
        data: { name: `${PREFIX} Soda`, kind: "goods", unitLabel: "pcs", buyingPrice: 40 },
      }),
      prisma.product.create({
        data: { name: `${PREFIX} Chapati`, kind: "dish", unitLabel: "pcs", buyingPrice: 0 },
      }),
    ]);
    ingredientId = ingredient.id;
    goodsId = goods.id;
    dishId = dish.id;
    await prisma.productLocation.create({
      data: {
        productId: dish.id,
        locationId: restaurant.id,
        sellingPrice: new Prisma.Decimal(200),
        active: true,
      },
    });

    const mv = (
      productId: string,
      locationId: string,
      movementType: string,
      quantity: number,
      occurredAt: Date,
      extra: Record<string, unknown> = {},
    ) => ({
      productId,
      locationId,
      movementType: movementType as never,
      quantity: new Prisma.Decimal(quantity),
      recordedById: adminId,
      occurredAt,
      ...extra,
    });

    // Opening stock, before the window.
    await prisma.stockMovement.createMany({
      data: [
        mv(ingredientId, storeId, "opening", 200, OPENING_AT),
        mv(goodsId, canteenId, "opening", 300, OPENING_AT),
        mv(goodsId, restaurantId, "opening", 200, OPENING_AT),
        mv(dishId, restaurantId, "production", 100, OPENING_AT),
      ],
    });

    // ── 08-29 — a plain trading day ────────────────────────────────
    const o1 = await prisma.order.create({
      data: {
        locationId: restaurantId,
        cashierId: adminId,
        orderType: "dine_in",
        paymentMethod: "cash",
        total: new Prisma.Decimal(1900),
        occurredAt: on("2024-08-29", 12),
      },
    });
    await prisma.stockMovement.createMany({
      data: [
        mv(dishId, restaurantId, "sale", -5, on("2024-08-29", 12), { orderId: o1.id }),
        mv(goodsId, restaurantId, "sale", -10, on("2024-08-29", 12), { orderId: o1.id }),
      ],
    });
    await canteenSale(20, on("2024-08-29", 18)); // 20 × 60 = 1,200
    await recordExpense(
      { category: "transport", amount: "350.00", date: "2024-08-29", paidFromAccount: "cash" },
      { actorId: adminId, role: "admin" },
    );

    // ── 08-30 — a purchase receipt lands (COGS term) + waste ───────
    await prisma.stockMovement.createMany({
      data: [
        mv(ingredientId, storeId, "purchase_receipt", 50, on("2024-08-30", 9)),
        mv(ingredientId, storeId, "issue", -20, on("2024-08-30", 10)),
        mv(ingredientId, storeId, "non_sale_consumption", -5, on("2024-08-30", 16), {
          reason: "spoiled" as never,
        }),
      ],
    });
    await recordExpense(
      { category: "gas_fuel", amount: "120.00", date: "2024-08-30", paidFromAccount: "cash" },
      { actorId: adminId, role: "admin" },
    );

    // ── 08-31 — quiet: one canteen sale only ──────────────────────
    await canteenSale(10, on("2024-08-31", 18)); // 600

    // ── 09-01 — first day of the new month: order + transfer ──────
    const o2 = await prisma.order.create({
      data: {
        locationId: restaurantId,
        cashierId: adminId,
        orderType: "takeaway",
        paymentMethod: "cash",
        total: new Prisma.Decimal(3000),
        occurredAt: on("2024-09-01", 13),
      },
    });
    supersededOrderId = o2.id;
    await prisma.stockMovement.createMany({
      data: [
        mv(goodsId, restaurantId, "sale", -20, on("2024-09-01", 13), { orderId: o2.id }),
        // internal transfer — must not move COGS
        mv(goodsId, storeId, "transfer", -12, on("2024-09-01", 14), {
          transferCounterpartLocationId: canteenId,
        }),
        mv(goodsId, canteenId, "transfer", 12, on("2024-09-01", 14, ), {
          transferCounterpartLocationId: storeId,
        }),
      ],
    });
    // supersede o2 with a correction (recomputed total 2,500)
    await prisma.order.create({
      data: {
        locationId: restaurantId,
        cashierId: adminId,
        orderType: "takeaway",
        paymentMethod: "cash",
        total: new Prisma.Decimal(2500),
        occurredAt: on("2024-09-01", 13),
        correctsOrderId: o2.id,
      },
    });
    await recordExpense(
      { category: "rent", amount: "1000.00", date: "2024-09-01", paidFromAccount: "mpesa_bank" },
      { actorId: adminId, role: "admin" },
    );

    // ── 09-02 — purchase + issue + canteen sale ───────────────────
    await prisma.stockMovement.createMany({
      data: [
        mv(goodsId, canteenId, "purchase_receipt", 40, on("2024-09-02", 8)),
        mv(ingredientId, storeId, "issue", -10, on("2024-09-02", 11)),
      ],
    });
    await canteenSale(15, on("2024-09-02", 18)); // 900
  });

  async function canteenSale(qty: number, at: Date) {
    const count = await prisma.stockCount.create({
      data: {
        productId: goodsId,
        locationId: canteenId,
        countedById: adminId,
        countedQuantity: new Prisma.Decimal(0),
        occurredAt: at,
      },
    });
    await prisma.stockMovement.create({
      data: {
        productId: goodsId,
        locationId: canteenId,
        movementType: "sale" as never,
        quantity: new Prisma.Decimal(-qty),
        recordedById: adminId,
        occurredAt: at,
        stockCountId: count.id,
      },
    });
    await prisma.moneyMovement.create({
      data: {
        account: "cash",
        amount: new Prisma.Decimal(qty * 60),
        sourceType: "canteen_sale",
        sourceId: count.id,
        recordedById: adminId,
        occurredAt: at,
      },
    });
  }

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const locs = await prisma.location.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const locIds = locs.map((l) => l.id);
    const prods = await prisma.product.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const prodIds = prods.map((p) => p.id);

    await prisma.moneyMovement.deleteMany({ where: { recordedById: { in: userIds } } });
    await prisma.orderLine.deleteMany({ where: { order: { locationId: { in: locIds } } } });
    await prisma.order.updateMany({
      where: { locationId: { in: locIds } },
      data: { correctsOrderId: null },
    });
    await prisma.order.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.stockMovement.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.stockCount.deleteMany({ where: { locationId: { in: locIds } } });
    const expenses = await prisma.expense.findMany({
      where: { recordedById: { in: userIds } },
      select: { id: true },
    });
    await prisma.expense.deleteMany({ where: { id: { in: expenses.map((e) => e.id) } } });
    await prisma.productLocation.deleteMany({ where: { productId: { in: prodIds } } });
    await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("every day's net matches getFinancialSummary(day, day) exactly", async () => {
    const series = await dailyNetSeries(DAYS[0], DAYS[DAYS.length - 1]);
    expect(series.map((s) => s.date)).toEqual([...DAYS]);

    for (const day of DAYS) {
      const summary = await getFinancialSummary(day, day);
      const fast = series.find((s) => s.date === day)!;
      expect(
        fast.net.toFixed(2),
        `net mismatch on ${day}`,
      ).toBe(summary.consolidated.netProfit);
      // revenue and expenses the week band exposes must agree too
      expect(fast.revenue.toFixed(2), `revenue mismatch on ${day}`).toBe(
        summary.consolidated.revenue,
      );
      expect(fast.expenses.toFixed(2), `expenses mismatch on ${day}`).toBe(
        summary.consolidated.totalExpenses,
      );
    }
  });

  it("the superseded order is not double-counted on 09-01", async () => {
    const series = await dailyNetSeries("2024-09-01", "2024-09-01");
    const summary = await getFinancialSummary("2024-09-01", "2024-09-01");
    // revenue is the correction's 2,500, not 3,000 + 2,500
    expect(series[0].revenue.toFixed(2)).toBe("2500.00");
    expect(series[0].revenue.toFixed(2)).toBe(summary.consolidated.revenue);
    void supersededOrderId;
  });

  it("summing the daily nets equals getFinancialSummary over the whole span", async () => {
    // NB: this holds because COGS is range-additive across contiguous
    // days — day N's closing == day N+1's opening. The month boundary is
    // not special.
    const series = await dailyNetSeries(DAYS[0], DAYS[DAYS.length - 1]);
    const summedNet = series.reduce(
      (s, r) => s + money(r.net.toFixed(2)),
      0,
    );
    const spanSummary = await getFinancialSummary(
      DAYS[0],
      DAYS[DAYS.length - 1],
    );
    expect(summedNet).toBeCloseTo(money(spanSummary.consolidated.netProfit), 2);
  });

  it("does not fire a query per day — query count is FIXED regardless of span", async () => {
    const MODELS = [
      "product",
      "stockMovement",
      "order",
      "moneyMovement",
      "expense",
      "stockCount",
    ] as const;
    const OPS = ["findMany", "count", "aggregate", "groupBy"] as const;

    const countQueriesFor = async (from: string, to: string): Promise<number> => {
      // vi.spyOn calls through by default — we only need the call counts.
      const spies: Array<{ mock: { calls: unknown[] }; mockRestore: () => void }> =
        [];
      for (const m of MODELS) {
        const delegate = prisma[m] as unknown as Record<
          string,
          (...a: unknown[]) => unknown
        >;
        for (const op of OPS) {
          if (typeof delegate[op] !== "function") continue;
          spies.push(
            vi.spyOn(delegate, op) as unknown as {
              mock: { calls: unknown[] };
              mockRestore: () => void;
            },
          );
        }
      }
      try {
        await dailyNetSeries(from, to);
        return spies.reduce((n, s) => n + s.mock.calls.length, 0);
      } finally {
        for (const s of spies) s.mockRestore();
      }
    };

    const twoDays = await countQueriesFor(DAYS[0], DAYS[1]);
    const fiveDays = await countQueriesFor(DAYS[0], DAYS[4]);
    // Same number of queries for a 2-day span and a 5-day span — the work
    // is span-wide bucketing in memory, not N round trips.
    expect(twoDays).toBe(fiveDays);
    expect(twoDays).toBeLessThanOrEqual(8);
  });
});
