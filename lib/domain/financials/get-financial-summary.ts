import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  businessDateEndUtc,
  businessDateLastInstantUtc,
  businessDateStartUtc,
} from "@/lib/time";
import { getAccountBalances } from "./get-account-balances";
import { getOwnerOwedToBusiness, getOwnerDrawsForPeriod } from "./owner-transactions";
import { getDishWasteCostPercent } from "./config";
import { DomainError } from "./errors";
import { moneyString } from "./internal";
import type {
  FinancialSummary,
  LocationFinancials,
  NonSaleConsumptionCost,
} from "./types";

const ZERO = new Prisma.Decimal(0);
const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertRange(from: string, to: string): void {
  if (!BUSINESS_DATE_RE.test(from)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "from must be a YYYY-MM-DD business date.",
      "from",
    );
  }
  if (!BUSINESS_DATE_RE.test(to)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "to must be a YYYY-MM-DD business date.",
      "to",
    );
  }
  if (from > to) {
    throw new DomainError("VALIDATION_ERROR", "from must not be after to.", "from");
  }
}

/**
 * The full financial picture for a business-date range (PRD §4.7 / SCHEMA
 * §14 / ADR-55). **Nothing here is stored** — every figure is summed on
 * read from the ledger tables.
 *
 *   Sales     Σ (units sold × selling price). Restaurant: `Order.total`
 *             over the LIVE rows (superseded originals dropped, correction
 *             rows kept — the fold `listOrders` does). Canteen: Σ
 *             `canteen_sale` MoneyMovement in the period.
 *
 *   COGS      opening stock value + purchase-RECEIPT value − closing stock
 *             value, summed over EVERY product at EVERY location. Each
 *             valuation is `quantity × costValue`, where costValue is
 *             `buyingPrice` for `ingredient` / `goods` and **0** for
 *             `dish` (ADR-33 — dishes are valued at zero, which is what
 *             prevents double-counting: the ingredients that became the
 *             dish were already counted as ingredients). "Added" is
 *             **purchase receipts only** — NOT production, NOT transfers,
 *             NOT opening adjustments. Transfers between the business's own
 *             locations never move COGS (nothing entered the business).
 *
 *   Gross     Sales − COGS.
 *   Net       Gross − Total Expenses (Σ Expense.amount in the period —
 *             correction rows are deltas on the same date, so a plain sum
 *             folds them).
 *
 * Per-location carries revenue, COGS and gross profit. `Expense` rows
 * carry no location, so expenses / net profit / debts are consolidated
 * only.
 *
 * `nonSaleConsumption` is a SEPARATE figure (see `computeNonSaleCost`) —
 * a view INTO COGS for management visibility, never an addition on top of
 * it. The wasted stock already left the ledger and is already inside the
 * COGS sweep.
 *
 * **Flows vs. balances (ADR-57).** Revenue, COGS, gross/net profit, total
 * expenses and non-sale consumption ACCUMULATE over `from..to` — they take
 * the whole range. The four position figures — `cashBalance`,
 * `mpesaBankBalance`, `debtsOwedToBusiness`, `ownerOwedToBusiness` — are a
 * LEVEL at one instant, so they are read **as of the end of `to`**
 * (`asOf`), never over the range. Pick "this month" and you see the
 * month's revenue next to cash as it stood on the last day of the month.
 */
export async function getFinancialSummary(
  from: string,
  to: string,
): Promise<FinancialSummary> {
  assertRange(from, to);
  const start = businessDateStartUtc(from);
  const end = businessDateEndUtc(to); // exclusive — for FLOW figures
  const asOf = businessDateLastInstantUtc(to); // point-in-time — for BALANCES

  const [
    locations,
    restaurantRevenue,
    canteenRevenue,
    cogsByLocation,
    expenseSum,
    debtSum,
    repaymentSum,
    balances,
    ownerOwed,
    ownerDrawsForPeriod,
    nonSaleConsumption,
  ] = await Promise.all([
    prisma.location.findMany({ select: { id: true, name: true } }),
    restaurantRevenueByLocation(start, end),
    canteenRevenueByLocation(start, end),
    cogsByLocationSweep(start, end),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: start, lt: end } },
    }),
    prisma.debt.aggregate({
      _sum: { amount: true },
      where: { occurredAt: { lte: asOf } },
    }),
    prisma.repayment.aggregate({
      _sum: { amount: true },
      where: { occurredAt: { lte: asOf } },
    }),
    getAccountBalances({ asOf }),
    getOwnerOwedToBusiness(asOf),
    getOwnerDrawsForPeriod(from, to),
    computeNonSaleCost(start, end),
  ]);

  const revenueByLocation = new Map<string, Prisma.Decimal>();
  for (const [locId, amt] of restaurantRevenue) {
    revenueByLocation.set(locId, (revenueByLocation.get(locId) ?? ZERO).add(amt));
  }
  for (const [locId, amt] of canteenRevenue) {
    revenueByLocation.set(locId, (revenueByLocation.get(locId) ?? ZERO).add(amt));
  }

  const locationName = new Map(locations.map((l) => [l.id, l.name]));
  const allLocationIds = new Set<string>([
    ...revenueByLocation.keys(),
    ...cogsByLocation.keys(),
  ]);

  const perLocation: LocationFinancials[] = [...allLocationIds]
    .map((locId) => {
      const revenue = revenueByLocation.get(locId) ?? ZERO;
      const cogs = cogsByLocation.get(locId) ?? ZERO;
      return {
        locationId: locId,
        locationName: locationName.get(locId) ?? locId,
        revenue: moneyString(revenue),
        cogs: moneyString(cogs),
        grossProfit: moneyString(revenue.sub(cogs)),
      };
    })
    .sort((a, b) => a.locationName.localeCompare(b.locationName));

  const revenue = [...revenueByLocation.values()].reduce((s, v) => s.add(v), ZERO);
  const cogs = [...cogsByLocation.values()].reduce((s, v) => s.add(v), ZERO);
  const grossProfit = revenue.sub(cogs);
  const totalExpenses = expenseSum._sum.amount ?? ZERO;
  const netProfit = grossProfit.sub(totalExpenses);
  const debtsOwed = (debtSum._sum.amount ?? ZERO).sub(
    repaymentSum._sum.amount ?? ZERO,
  );

  return {
    from,
    to,
    perLocation,
    consolidated: {
      revenue: moneyString(revenue),
      cogs: moneyString(cogs),
      grossProfit: moneyString(grossProfit),
      totalExpenses: moneyString(totalExpenses),
      netProfit: moneyString(netProfit),
      debtsOwedToBusiness: moneyString(debtsOwed),
      ownerOwedToBusiness: moneyString(ownerOwed),
      ownerDrawsForPeriod: moneyString(ownerDrawsForPeriod),
      cashBalance: moneyString(balances.cash),
      mpesaBankBalance: moneyString(balances.mpesaBank),
    },
    nonSaleConsumption,
  };
}

// ── Revenue ───────────────────────────────────────────────────────────

/**
 * Restaurant revenue per location: `Σ Order.total` over the LIVE order
 * rows whose `occurredAt` is in the window. Live = every order minus the
 * ones a correction supersedes; correction rows are kept and carry the
 * full recomputed total (a naive sum of every row double-counts a
 * corrected sale — live bug 2026-09-01 F1).
 */
async function restaurantRevenueByLocation(
  start: Date,
  end: Date,
): Promise<Map<string, Prisma.Decimal>> {
  const orders = await prisma.order.findMany({
    where: { occurredAt: { gte: start, lt: end } },
    select: { id: true, total: true, locationId: true },
  });
  const supersededIds = new Set(
    (
      await prisma.order.findMany({
        where: { correctsOrderId: { in: orders.map((o) => o.id) } },
        select: { correctsOrderId: true },
      })
    ).map((r) => r.correctsOrderId as string),
  );
  const byLocation = new Map<string, Prisma.Decimal>();
  for (const o of orders) {
    if (supersededIds.has(o.id)) continue;
    byLocation.set(
      o.locationId,
      (byLocation.get(o.locationId) ?? ZERO).add(o.total),
    );
  }
  return byLocation;
}

/**
 * Canteen revenue per location: Σ `canteen_sale` MoneyMovement amounts in
 * the window, grouped by the location of the `StockCount` each stems from.
 * `voidStockCount` writes an offsetting negative row, so a plain sum
 * reflects only live counts.
 */
async function canteenRevenueByLocation(
  start: Date,
  end: Date,
): Promise<Map<string, Prisma.Decimal>> {
  const rows = await prisma.moneyMovement.findMany({
    where: { sourceType: "canteen_sale", occurredAt: { gte: start, lt: end } },
    select: { amount: true, sourceId: true },
  });
  const countIds = [
    ...new Set(rows.map((r) => r.sourceId).filter((v): v is string => v != null)),
  ];
  const counts = await prisma.stockCount.findMany({
    where: { id: { in: countIds } },
    select: { id: true, locationId: true },
  });
  const locByCount = new Map(counts.map((c) => [c.id, c.locationId]));
  const byLocation = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    const locId = r.sourceId ? locByCount.get(r.sourceId) : undefined;
    if (!locId) continue;
    byLocation.set(locId, (byLocation.get(locId) ?? ZERO).add(r.amount));
  }
  return byLocation;
}

// ── COGS ──────────────────────────────────────────────────────────────

const COST_VALUE_ZERO_KINDS = new Set(["dish"]);

/**
 * COGS per location: `opening value + purchase-receipt value − closing
 * value`, over every product at that location.
 *
 *   opening value  = Σ over products of (Σ quantity where occurredAt <
 *                    period start, PLUS any `opening`-type row dated
 *                    exactly at period start) × costValue(product)
 *   closing value  = same, occurredAt < period end
 *   purchases      = Σ over products of (Σ `purchase_receipt` quantity in
 *                    the period) × costValue(product)
 *
 * `costValue` = `buyingPrice` for ingredient / goods, `0` for dish. A dish
 * therefore contributes nothing to opening/closing, and production (which
 * only adds dishes) contributes nothing — but we also scope "purchases"
 * to `purchase_receipt` explicitly rather than leaning on that. Transfers
 * are never in the purchases term, so an internal Store→Canteen move
 * nets to zero across the opening/closing deltas and doesn't touch COGS.
 *
 * **The opening-boundary carve-out.** `setOpeningStock` stamps every
 * `opening` row at `businessDateStartUtc(businessDate)` — the exact
 * instant this sweep uses as `start`. A strict `occurredAt < start` would
 * drop that row from the opening term while the closing term (`< end`)
 * still counts it, so on the first day opening stock is entered COGS is
 * dragged negative by the entire opening-stock valuation. An `opening`
 * row dated at `start` IS the period's starting position, so it belongs
 * in the opening term. It cannot leak into the purchases term (that is
 * `purchase_receipt` only), and nothing but `setOpeningStock` ever writes
 * at exactly `start`, so this does not double-count anything.
 */
async function cogsByLocationSweep(
  start: Date,
  end: Date,
): Promise<Map<string, Prisma.Decimal>> {
  const products = await prisma.product.findMany({
    select: { id: true, kind: true, buyingPrice: true },
  });
  const costValueById = new Map<string, Prisma.Decimal>(
    products.map((p) => [
      p.id,
      COST_VALUE_ZERO_KINDS.has(p.kind) ? ZERO : p.buyingPrice ?? ZERO,
    ]),
  );

  const [openingRows, closingRows, purchaseRows] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["productId", "locationId"],
      _sum: { quantity: true },
      where: {
        OR: [
          { occurredAt: { lt: start } },
          // The opening-boundary carve-out (see the doc comment above): an
          // `opening` row dated exactly at `start` is the period's starting
          // position and belongs in the opening term.
          { occurredAt: start, movementType: "opening" },
        ],
      },
    }),
    prisma.stockMovement.groupBy({
      by: ["productId", "locationId"],
      _sum: { quantity: true },
      where: { occurredAt: { lt: end } },
    }),
    prisma.stockMovement.groupBy({
      by: ["productId", "locationId"],
      _sum: { quantity: true },
      where: {
        movementType: "purchase_receipt",
        occurredAt: { gte: start, lt: end },
      },
    }),
  ]);

  // location -> signed value contribution.
  const byLocation = new Map<string, Prisma.Decimal>();
  const add = (locationId: string, delta: Prisma.Decimal) => {
    byLocation.set(locationId, (byLocation.get(locationId) ?? ZERO).add(delta));
  };
  const valueOf = (
    row: { productId: string; _sum: { quantity: Prisma.Decimal | null } },
  ): Prisma.Decimal =>
    (row._sum.quantity ?? ZERO).mul(costValueById.get(row.productId) ?? ZERO);

  for (const r of openingRows) add(r.locationId, valueOf(r)); // + opening
  for (const r of purchaseRows) add(r.locationId, valueOf(r)); // + purchases
  for (const r of closingRows) add(r.locationId, valueOf(r).negated()); // − closing

  return byLocation;
}

// ── Non-sale consumption cost (SEPARATE — a view into COGS) ────────────

/**
 * The estimated cost of `non_sale_consumption` stock in the period,
 * broken out by reason. **Not part of COGS** and does not reduce Gross or
 * Net Profit (ADR-55) — the wasted units already left the ledger and are
 * already inside the COGS sweep; this is a management-visibility estimate
 * of a cost that is already counted.
 *
 * Per consumed unit:
 *   - ingredient / goods → `buyingPrice`
 *   - dish              → `dishWasteCostPercent × sellingPrice`
 *
 * `sellingPrice` for a dish is taken from its Restaurant `ProductLocation`
 * row (dishes are sold only at the Restaurant). Correction deltas on
 * `non_sale_consumption` rows are signed and fold in.
 */
async function computeNonSaleCost(
  start: Date,
  end: Date,
): Promise<NonSaleConsumptionCost> {
  const percent = getDishWasteCostPercent();

  const rows = await prisma.stockMovement.findMany({
    where: {
      movementType: "non_sale_consumption",
      occurredAt: { gte: start, lt: end },
    },
    select: {
      quantity: true,
      reason: true,
      product: {
        select: {
          kind: true,
          buyingPrice: true,
          productLocations: { select: { sellingPrice: true } },
        },
      },
    },
  });

  const byReason = {
    staff_meal: ZERO,
    complimentary: ZERO,
    spoiled: ZERO,
    damaged: ZERO,
    other: ZERO,
  };

  for (const r of rows) {
    const unitsConsumed = r.quantity.negated(); // rows are negative
    let unitCost: Prisma.Decimal;
    if (r.product.kind === "dish") {
      const sellingPrice =
        r.product.productLocations
          .map((pl) => pl.sellingPrice)
          .find((p): p is Prisma.Decimal => p != null) ?? ZERO;
      unitCost = sellingPrice.mul(percent);
    } else {
      unitCost = r.product.buyingPrice ?? ZERO;
    }
    const cost = unitsConsumed.mul(unitCost);
    const key = (r.reason ?? "other") as keyof typeof byReason;
    byReason[key] = byReason[key].add(cost);
  }

  const total = Object.values(byReason).reduce((s, v) => s.add(v), ZERO);

  return {
    total: moneyString(total),
    byReason: {
      staffMeal: moneyString(byReason.staff_meal),
      complimentary: moneyString(byReason.complimentary),
      spoiled: moneyString(byReason.spoiled),
      damaged: moneyString(byReason.damaged),
      other: moneyString(byReason.other),
    },
    dishWasteCostPercent: percent.toFixed(2),
  };
}
