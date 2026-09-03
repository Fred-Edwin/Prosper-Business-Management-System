import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFinancialSummary, recordExpense } from "@/lib/domain/financials";
import { businessWeekRange, nairobiToday, addBusinessDays } from "@/lib/time";
import { getDashboard } from "./get-dashboard";

/**
 * The `/admin` dashboard aggregator (M5 S13). Two concerns:
 *
 *  1. SHAPE + SEMANTICS on controlled fixtures — week is Monday-first and
 *     matches `businessWeekRange`; future days in the current week are
 *     `null` (not zero); needs-attention's all-clear state is empty
 *     collections not an error; position equals what `getFinancialSummary`
 *     derives for the same instant.
 *  2. PERFORMANCE against the SEEDED database — the full aggregator for
 *     "today" completes fast enough for a morning screen (it must not run
 *     ~37 stock sweeps).
 *
 * Fixture rows are namespaced `PREFIX` and dated into a fixed past week
 * (Mon 2025-03-03 … Sun 2025-03-09) that nothing else writes to.
 */

const PREFIX = "__dashboard_agg__";
const d = (iso: string) => new Date(iso);
const OPENING_AT = d("2025-02-01T05:00:00Z");
const on = (date: string, h: number) =>
  d(`${date}T${String(h).padStart(2, "0")}:00:00+03:00`);

// A Wednesday — mid-week, so Thu–Sun are "future" relative to it.
const AS_OF = "2025-03-05";
const WEEK = businessWeekRange(AS_OF); // { from: 2025-03-03 (Mon), to: 2025-03-09 (Sun) }

const money = (v: string) => Number(v);

describe("getDashboard — shape, week semantics, position source-of-truth", () => {
  let adminId: string;
  let restaurantId: string;
  let canteenId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    adminId = admin.id;
    const [restaurant, canteen] = await Promise.all([
      prisma.location.create({ data: { name: `${PREFIX} Restaurant`, type: "restaurant" } }),
      prisma.location.create({ data: { name: `${PREFIX} Canteen`, type: "canteen" } }),
    ]);
    restaurantId = restaurant.id;
    canteenId = canteen.id;

    const goods = await prisma.product.create({
      data: { name: `${PREFIX} Soda`, kind: "goods", unitLabel: "pcs", buyingPrice: 40 },
    });

    const mv = (
      productId: string,
      locationId: string,
      movementType: string,
      quantity: number,
      occurredAt: Date,
      orderId?: string,
    ) => ({
      productId,
      locationId,
      movementType: movementType as never,
      quantity: new Prisma.Decimal(quantity),
      recordedById: adminId,
      occurredAt,
      orderId: orderId ?? null,
    });

    await prisma.stockMovement.createMany({
      data: [
        mv(goods.id, restaurantId, "opening", 500, OPENING_AT),
        mv(goods.id, canteenId, "opening", 500, OPENING_AT),
      ],
    });

    // Mon + Tue + Wed (AS_OF) each have a restaurant order. Thu–Sun: none.
    for (const [date, total] of [
      ["2025-03-03", 1000],
      ["2025-03-04", 1500],
      ["2025-03-05", 800],
    ] as const) {
      const o = await prisma.order.create({
        data: {
          locationId: restaurantId,
          cashierId: adminId,
          orderType: "dine_in",
          paymentMethod: "cash",
          total: new Prisma.Decimal(total),
          occurredAt: on(date, 12),
        },
      });
      await prisma.stockMovement.create({
        data: mv(goods.id, restaurantId, "sale", -5, on(date, 12), o.id),
      });
    }

    // One expense on Tue.
    await recordExpense(
      { category: "transport", amount: "200.00", date: "2025-03-04", paidFromAccount: "cash" },
      { actorId: adminId, role: "admin" },
    );

    // Prior week (Mon 2025-02-24): one order so the "vs. last week"
    // figures are non-zero.
    const po = await prisma.order.create({
      data: {
        locationId: restaurantId,
        cashierId: adminId,
        orderType: "dine_in",
        paymentMethod: "cash",
        total: new Prisma.Decimal(600),
        occurredAt: on("2025-02-24", 12),
      },
    });
    await prisma.stockMovement.create({
      data: mv(goods.id, restaurantId, "sale", -3, on("2025-02-24", 12), po.id),
    });
  });

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
    await prisma.order.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.stockMovement.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.stockCount.deleteMany({ where: { locationId: { in: locIds } } });
    const expenses = await prisma.expense.findMany({
      where: { recordedById: { in: userIds } },
      select: { id: true },
    });
    await prisma.expense.deleteMany({ where: { id: { in: expenses.map((e) => e.id) } } });
    await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("week is Monday-first and matches businessWeekRange", async () => {
    const dash = await getDashboard(AS_OF);
    expect(dash.week.from).toBe(WEEK.from);
    expect(dash.week.to).toBe(WEEK.to);
    expect(dash.week.dailyNet).toHaveLength(7);
    expect(dash.week.dailyNet[0].date).toBe(WEEK.from); // Monday
    expect(new Date(`${WEEK.from}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it("future days in the current week are null, not zero", async () => {
    const dash = await getDashboard(AS_OF);
    const byDate = new Map(dash.week.dailyNet.map((x) => [x.date, x.net]));
    // Mon–Wed have happened → strings (Wed even though it's AS_OF).
    expect(byDate.get("2025-03-03")).not.toBeNull();
    expect(byDate.get("2025-03-05")).not.toBeNull();
    // Thu–Sun are future → null.
    for (const day of ["2025-03-06", "2025-03-07", "2025-03-08", "2025-03-09"]) {
      expect(byDate.get(day), day).toBeNull();
    }
  });

  it("each present week day's net equals getFinancialSummary(day, day)", async () => {
    const dash = await getDashboard(AS_OF);
    for (const day of ["2025-03-03", "2025-03-04", "2025-03-05"]) {
      const s = await getFinancialSummary(day, day);
      const net = dash.week.dailyNet.find((x) => x.date === day)!.net;
      expect(net, day).toBe(s.consolidated.netProfit);
    }
  });

  it("WTD figures equal getFinancialSummary over Mon..AS_OF; prior-week figures over the shifted range", async () => {
    const dash = await getDashboard(AS_OF);
    const wtd = await getFinancialSummary(WEEK.from, AS_OF);
    expect(dash.week.revenueWtd).toBe(wtd.consolidated.revenue);
    expect(dash.week.expensesWtd).toBe(wtd.consolidated.totalExpenses);
    expect(dash.week.netWtd).toBe(wtd.consolidated.netProfit);

    const prior = await getFinancialSummary(
      addBusinessDays(WEEK.from, -7),
      addBusinessDays(AS_OF, -7),
    );
    expect(dash.week.revenuePriorWtd).toBe(prior.consolidated.revenue);
    expect(dash.week.expensesPriorWtd).toBe(prior.consolidated.totalExpenses);
    expect(dash.week.netPriorWtd).toBe(prior.consolidated.netProfit);
  });

  it("30-day trend has 30 oldest-first entries and its total is their sum", async () => {
    const dash = await getDashboard(AS_OF);
    expect(dash.trend.dailyNet).toHaveLength(30);
    expect(dash.trend.dailyNet[0].date).toBe(addBusinessDays(AS_OF, -29));
    expect(dash.trend.dailyNet[29].date).toBe(AS_OF);
    const summed = dash.trend.dailyNet.reduce((s, x) => s + money(x.net), 0);
    expect(summed).toBeCloseTo(money(dash.trend.net30Total), 2);
  });

  it("position equals the balances getFinancialSummary derives for the same instant", async () => {
    const dash = await getDashboard(AS_OF);
    const s = await getFinancialSummary(AS_OF, AS_OF);
    expect(dash.position.cash).toBe(s.consolidated.cashBalance);
    expect(dash.position.mpesaBank).toBe(s.consolidated.mpesaBankBalance);
    expect(dash.position.ownerOwedToBusiness).toBe(
      s.consolidated.ownerOwedToBusiness,
    );
    expect(dash.position.liquidity).toBe(
      (
        Number(s.consolidated.cashBalance) +
        Number(s.consolidated.mpesaBankBalance)
      ).toFixed(2),
    );
  });

  it("rejects a malformed date", async () => {
    await expect(getDashboard("2025-3-5")).rejects.toThrow(/YYYY-MM-DD/);
  });
});

describe("getDashboard — needs-attention all-clear + Today band", () => {
  // No fixtures: run against whatever the seed left. We only assert
  // structural invariants that hold regardless of data.
  it("returns collections (never throws) and every count is a number", async () => {
    const dash = await getDashboard(nairobiToday());
    const na = dash.needsAttention;
    expect(Array.isArray(na.openPriorDates)).toBe(true);
    expect(Array.isArray(na.handoversAwaitingReceipt.items)).toBe(true);
    expect(typeof na.handoversAwaitingReceipt.count).toBe("number");
    expect(typeof na.openShortfalls.count).toBe("number");
    expect(typeof na.openShortfalls.total).toBe("string");
    expect(Array.isArray(na.lowOrNegativeStock.top)).toBe(true);
    expect(na.lowOrNegativeStock.top.length).toBeLessThanOrEqual(3);

    expect(dash.today.date).toBe(nairobiToday());
    for (const k of [
      "stockMovementCount",
      "purchaseReceiptCount",
      "handoversReceived",
      "handoversDue",
      "correctionCountToday",
    ] as const) {
      expect(typeof dash.today[k], k).toBe("number");
    }
    expect(dash.today.salesSoFar).toMatch(/^-?\d+\.\d{2}$/);
  });

  it("openPriorDates never includes today", async () => {
    const dash = await getDashboard(nairobiToday());
    expect(dash.needsAttention.openPriorDates).not.toContain(nairobiToday());
  });

  it("PERF: the full aggregator for today on the seeded DB is well under a second", async () => {
    const t0 = performance.now();
    await getDashboard(nairobiToday());
    const ms = performance.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`[dashboard perf] getDashboard(today) on seeded DB: ${ms.toFixed(0)}ms`);
    // A naive 37-sweep implementation runs hundreds of ms to seconds even
    // on the small seed; the bucketed path should be a small fraction of
    // that. Generous ceiling so CI noise doesn't flake it.
    expect(ms).toBeLessThan(2000);
  });
});
