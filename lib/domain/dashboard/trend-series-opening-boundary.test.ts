import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setOpeningStock } from "@/lib/domain/stock";
import { getFinancialSummary } from "@/lib/domain/financials";
import { nairobiToday } from "@/lib/time";
import { dailyNetSeries } from "./trend-series";

/**
 * Regression — the opening-stock boundary in `dailyNetSeries` (Session 16,
 * QA walkthrough).
 *
 * `dailyNetSeries` derives COGS via the telescoping identity
 * `cogsDay = purchases − Σ(all movement value in the day)` (ADR-64),
 * which assumes a STRICT `< dayStart` opening term. `setOpeningStock`
 * stamps `opening` rows at exactly `businessDateStartUtc(date)`, so on the
 * first day opening stock is entered those rows landed in the day's
 * `movementValue` and `cogsDay = 0 − openingValue` faked a large negative
 * COGS → a large positive net (the dashboard showed +32,700 "net profit"
 * with nothing sold).
 *
 * `trend-series` now excludes `opening` rows dated exactly at their
 * business-day start from `movementValue`, mirroring the carve-out in
 * `getFinancialSummary`. This suite pins the AGREEMENT: for a day whose
 * only activity is opening stock, both paths must report net 0.
 */

const PREFIX = "__trend_opening_boundary__";
const DAY1 = nairobiToday();

describe("dailyNetSeries — opening stock entered on day 1 does not fake net profit", () => {
  let adminId: string;
  let storeId: string;
  let restaurantId: string;
  let ingredientId: string;
  let goodsId: string;
  let netBefore: number;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: `${PREFIX} Admin`, pinHash: "x", role: "admin", active: true },
    });
    adminId = admin.id;

    const [store, restaurant] = await Promise.all([
      prisma.location.create({ data: { name: `${PREFIX} Store`, type: "store" } }),
      prisma.location.create({
        data: { name: `${PREFIX} Restaurant`, type: "restaurant" },
      }),
    ]);
    storeId = store.id;
    restaurantId = restaurant.id;

    const [ingredient, goods] = await Promise.all([
      prisma.product.create({
        data: {
          name: `${PREFIX} Flour`,
          kind: "ingredient",
          unitLabel: "kg",
          buyingPrice: 100,
        },
      }),
      prisma.product.create({
        data: {
          name: `${PREFIX} Soda`,
          kind: "goods",
          unitLabel: "pcs",
          buyingPrice: 40,
        },
      }),
    ]);
    ingredientId = ingredient.id;
    goodsId = goods.id;
    await Promise.all([
      prisma.productLocation.create({
        data: { productId: ingredient.id, locationId: store.id, active: true },
      }),
      prisma.productLocation.create({
        data: {
          productId: goods.id,
          locationId: restaurant.id,
          sellingPrice: 60,
          active: true,
        },
      }),
    ]);

    // Baseline for today BEFORE this suite seeds opening stock (other
    // suites share the DB — assert on this suite's delta).
    netBefore = Number(
      (await dailyNetSeries(DAY1, DAY1))[0]?.net ?? 0,
    );

    await setOpeningStock({
      productId: ingredientId,
      locationId: storeId,
      businessDate: DAY1,
      quantity: "40", // value 4,000
      recordedById: adminId,
    });
    await setOpeningStock({
      productId: goodsId,
      locationId: restaurantId,
      businessDate: DAY1,
      quantity: "50", // value 2,000
      recordedById: adminId,
    });
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({
      where: { recordedBy: { name: { startsWith: PREFIX } } },
    });
    await prisma.productLocation.deleteMany({
      where: { product: { name: { startsWith: PREFIX } } },
    });
    await prisma.product.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("adds ZERO to the day's net (was + KES 6,000 pre-fix)", async () => {
    const net = Number((await dailyNetSeries(DAY1, DAY1))[0].net);
    expect(net - netBefore).toBeCloseTo(0, 2);
  });

  it("agrees with getFinancialSummary(day, day) to the cent", async () => {
    const seriesNet = Number((await dailyNetSeries(DAY1, DAY1))[0].net);
    const summaryNet = Number(
      (await getFinancialSummary(DAY1, DAY1)).consolidated.netProfit,
    );
    expect(seriesNet).toBeCloseTo(summaryNet, 2);
  });
});
