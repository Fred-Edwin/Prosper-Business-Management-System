import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFinancialSummary } from "@/lib/domain/financials";
import { recordExpense } from "@/lib/domain/financials";
import { getDayDetail } from "./get-day-detail";

/**
 * THE RECONCILIATION GUARANTEE (M5 S11, task 3).
 *
 * The one correctness risk this session carries: a day-detail read whose
 * figures disagree with what `/admin/financials` shows for the same date.
 * `getFinancialSummary(date, date)` is the single source of truth for the
 * period numbers (owner decision — there is no separate reports page).
 *
 * This suite stands up ONE full business day — a restaurant order, a
 * canteen derived sale, an expense, an owner draw, two handovers — on a
 * fixed date nothing else touches, then asserts the day detail's totals
 * equal the summary's for that same date. If they diverge, the day
 * detail is wrong: fix it, do not adjust the test.
 *
 * Scope: rows are namespaced with `PREFIX` and dated to 2024-08-20.
 * Opening stock is dated 2024-08-01 (before the day) so every figure is
 * exactly this suite's.
 */

const PREFIX = "__day_detail_recon__";
const DATE = "2024-08-20";
const d = (iso: string) => new Date(iso);
const OPENING_AT = d("2024-08-01T05:00:00Z");
// Instants inside the 2024-08-20 Africa/Nairobi business day.
const on = (h: number) =>
  d(`2024-08-20T${String(h).padStart(2, "0")}:00:00+03:00`);

const money = (v: string) => Number(v);

describe("day detail reconciles with getFinancialSummary for the same date", () => {
  let adminId: string;
  let restaurantId: string;
  let canteenId: string;
  let storeId: string;
  let goodsId: string;
  let dishId: string;
  let staffCashierId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    adminId = admin.id;

    const restaurant = await prisma.location.create({
      data: { name: `${PREFIX} Restaurant`, type: "restaurant" },
    });
    const canteen = await prisma.location.create({
      data: { name: `${PREFIX} Canteen`, type: "canteen" },
    });
    const store = await prisma.location.create({
      data: { name: `${PREFIX} Store`, type: "store" },
    });
    restaurantId = restaurant.id;
    canteenId = canteen.id;
    storeId = store.id;

    const goods = await prisma.product.create({
      data: { name: `${PREFIX} Soda`, kind: "goods", unitLabel: "pcs", buyingPrice: 40 },
    });
    const dish = await prisma.product.create({
      data: { name: `${PREFIX} Chapati`, kind: "dish", unitLabel: "pcs", buyingPrice: 0 },
    });
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

    const staff = await prisma.staff.create({
      data: {
        name: `${PREFIX} Cashier`,
        role: "cashier",
        dailyRate: "500.00",
        locationId: restaurant.id,
      },
    });
    staffCashierId = staff.id;

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

    // Opening stock (before the day).
    await prisma.stockMovement.createMany({
      data: [
        mv(goodsId, canteenId, "opening", 100, OPENING_AT),
        mv(goodsId, restaurantId, "opening", 50, OPENING_AT),
        mv(dishId, restaurantId, "production", 30, d("2024-08-19T05:00:00Z")),
      ],
    });

    // Restaurant order on DATE: dish 5×200 + goods 10×60 = 1,900.
    const order = await prisma.order.create({
      data: {
        locationId: restaurantId,
        cashierId: adminId,
        orderType: "dine_in",
        paymentMethod: "cash",
        total: new Prisma.Decimal(1900),
        occurredAt: on(12),
        lines: {
          create: [
            {
              productId: dishId,
              quantity: new Prisma.Decimal(5),
              unitPrice: new Prisma.Decimal(200),
              subtotal: new Prisma.Decimal(1000),
            },
            {
              productId: goodsId,
              quantity: new Prisma.Decimal(10),
              unitPrice: new Prisma.Decimal(60),
              subtotal: new Prisma.Decimal(600),
            },
          ],
        },
      },
    });
    await prisma.stockMovement.createMany({
      data: [
        mv(dishId, restaurantId, "sale", -5, on(12), order.id),
        mv(goodsId, restaurantId, "sale", -10, on(12), order.id),
      ],
    });

    // Canteen derived sale on DATE: 20 × 60 = 1,200.
    const count = await prisma.stockCount.create({
      data: {
        productId: goodsId,
        locationId: canteenId,
        countedById: adminId,
        countedQuantity: new Prisma.Decimal(80),
        occurredAt: on(18),
      },
    });
    await prisma.stockMovement.create({
      data: { ...mv(goodsId, canteenId, "sale", -20, on(18)), stockCountId: count.id },
    });
    await prisma.moneyMovement.create({
      data: {
        account: "cash",
        amount: new Prisma.Decimal(1200),
        sourceType: "canteen_sale",
        sourceId: count.id,
        recordedById: adminId,
        occurredAt: on(18),
      },
    });

    // Expense on DATE.
    await recordExpense(
      { category: "transport", amount: "350.00", date: DATE, paidFromAccount: "cash" },
      { actorId: adminId, role: "admin" },
    );

    // Owner draw on DATE.
    await prisma.ownerTransaction.create({
      data: {
        type: "draw",
        amount: new Prisma.Decimal(500),
        date: on(20),
        note: `${PREFIX} draw`,
      },
    });
    await prisma.moneyMovement.create({
      data: {
        account: "cash",
        amount: new Prisma.Decimal(-500),
        sourceType: "owner_draw",
        recordedById: adminId,
        occurredAt: on(20),
      },
    });

    // Two handovers on DATE (custody transfers — no MoneyMovement, ADR-54).
    await prisma.handover.create({
      data: {
        staffId: staffCashierId,
        locationId: restaurantId,
        cashDeclared: new Prisma.Decimal(1900),
        mpesaDeclared: new Prisma.Decimal(0),
        occurredAt: on(21),
      },
    });
    await prisma.handover.create({
      data: {
        staffId: staffCashierId,
        locationId: canteenId,
        cashDeclared: new Prisma.Decimal(1200),
        mpesaDeclared: new Prisma.Decimal(0),
        occurredAt: on(21),
      },
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
    await prisma.handoverShortfall.deleteMany({
      where: { receiptOfHandover: { handover: { locationId: { in: locIds } } } },
    });
    await prisma.receiptOfHandover.deleteMany({
      where: { handover: { locationId: { in: locIds } } },
    });
    await prisma.handover.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.orderLine.deleteMany({
      where: { order: { locationId: { in: locIds } } },
    });
    await prisma.order.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.stockMovement.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.stockCount.deleteMany({ where: { locationId: { in: locIds } } });
    await prisma.ownerTransaction.deleteMany({ where: { note: { startsWith: PREFIX } } });
    const expenses = await prisma.expense.findMany({
      where: { recordedById: { in: userIds } },
      select: { id: true },
    });
    await prisma.expense.deleteMany({ where: { id: { in: expenses.map((e) => e.id) } } });
    await prisma.productLocation.deleteMany({ where: { productId: { in: prodIds } } });
    await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
    await prisma.staff.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("revenue: Σ day-detail order + canteen-sale rows == summary revenue", async () => {
    const [summary, detail] = await Promise.all([
      getFinancialSummary(DATE, DATE),
      getDayDetail(DATE),
    ]);

    // Day detail's restaurant revenue = Σ live order totals.
    const restaurantRevenue = detail.orders.reduce(
      (s, o) => s + money(o.total),
      0,
    );
    // Canteen revenue on the day = Σ canteen_sale MoneyMovement, which the
    // day detail surfaces as `derivedRevenue` on the canteen `sale`
    // movement rows.
    const canteenRevenue = detail.stockMovements
      .filter((m) => m.derivedRevenue != null)
      .reduce((s, m) => s + money(m.derivedRevenue as string), 0);

    expect(restaurantRevenue).toBeCloseTo(1900, 2);
    expect(canteenRevenue).toBeCloseTo(1200, 2);
    expect(restaurantRevenue + canteenRevenue).toBeCloseTo(
      money(summary.consolidated.revenue),
      2,
    );
  });

  it("expenses: Σ day-detail expenses == summary total expenses", async () => {
    const [summary, detail] = await Promise.all([
      getFinancialSummary(DATE, DATE),
      getDayDetail(DATE),
    ]);
    const sum = detail.expenses.reduce((s, e) => s + money(e.amount), 0);
    expect(sum).toBeCloseTo(350, 2);
    expect(sum).toBeCloseTo(money(summary.consolidated.totalExpenses), 2);
  });

  it("handovers: day-detail declared cash/M-Pesa == the day's reconciliation figures", async () => {
    const detail = await getDayDetail(DATE);
    const declaredCash = detail.handovers.reduce(
      (s, h) => s + money(h.cashDeclared),
      0,
    );
    const declaredMpesa = detail.handovers.reduce(
      (s, h) => s + money(h.mpesaDeclared),
      0,
    );
    expect(detail.handovers.length).toBe(2);
    expect(declaredCash).toBeCloseTo(3100, 2);
    expect(declaredMpesa).toBeCloseTo(0, 2);
  });

  it("owner transactions: the day's draw appears in the day detail", async () => {
    const detail = await getDayDetail(DATE);
    expect(detail.ownerTransactions).toHaveLength(1);
    expect(detail.ownerTransactions[0].type).toBe("draw");
    expect(money(detail.ownerTransactions[0].amount)).toBeCloseTo(500, 2);
  });

  it("an empty date returns empty collections, not an error", async () => {
    const detail = await getDayDetail("2024-08-25");
    expect(detail.orders).toEqual([]);
    expect(detail.stockMovements).toEqual([]);
    expect(detail.handovers).toEqual([]);
    expect(detail.expenses).toEqual([]);
    expect(detail.ownerTransactions).toEqual([]);
    expect(detail.stockCounts).toEqual([]);
    expect(detail.payouts).toEqual([]);
    expect(detail.closed).toBe(false);
  });

  it("day detail returns every category for the seeded date", async () => {
    const detail = await getDayDetail(DATE);
    expect(detail.orders.length).toBeGreaterThan(0);
    expect(detail.stockMovements.length).toBeGreaterThan(0);
    expect(detail.handovers.length).toBe(2);
    expect(detail.expenses.length).toBe(1);
    expect(detail.ownerTransactions.length).toBe(1);
    expect(detail.stockCounts.length).toBe(1);
  });
});
