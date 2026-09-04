import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addBusinessDays,
  businessDateEndUtc,
  businessDateStartUtc,
  toBusinessDate,
} from "@/lib/time";

/**
 * Net profit per business date for a contiguous span — the figure Band 2
 * (this week) and Band 5 (30-day trend) plot as bars.
 *
 * ── Why this exists ─────────────────────────────────────────────────
 * The bands together need net profit for ~37 separate days. The obvious
 * implementation calls `getFinancialSummary(day, day)` once per day, and
 * EACH of those runs a full stock-valuation sweep (opening + purchases −
 * closing over every product at every location). 37 sweeps on the screen
 * the owner opens every morning is far too slow.
 *
 * ── The identity that makes it cheap (ADR-64) ───────────────────────
 * For a SINGLE day, `getFinancialSummary`'s COGS is
 *
 *     openingValue(occurredAt < dayStart)
 *       + purchaseReceiptValue(occurredAt ∈ [dayStart, dayEnd))
 *       − closingValue(occurredAt < dayEnd)
 *
 * The opening and closing terms telescope: `closingValue(< dayEnd) −
 * openingValue(< dayStart)` is exactly the summed value of EVERY
 * `StockMovement` whose `occurredAt` falls in `[dayStart, dayEnd)`
 * (value = quantity × costValue, costValue = `buyingPrice` for
 * ingredient/goods, 0 for dish). So
 *
 *     cogsDay = purchaseReceiptValueDay − Σ (allMovementValue in the day)
 *
 * and NO opening sweep is needed. Every figure the series needs then
 * comes from a fixed handful of span-wide queries, bucketed by business
 * date in memory — the query count does not grow with the number of
 * days.
 *
 * ── The opening-boundary carve-out ──────────────────────────────────
 * The telescoping identity assumes a STRICT `< dayStart` opening term.
 * `setOpeningStock` stamps `opening` rows at exactly
 * `businessDateStartUtc(date)` = that day's `dayStart`, and
 * `getFinancialSummary` carves those rows INTO its opening term (they are
 * carried-in balance, not that day's flow). To keep this series in
 * lock-step with it, an `opening` row dated exactly at its business-day
 * start is EXCLUDED from `movementValue` here — it never was same-day
 * activity. Without this, day 1's `movementValue` would swallow the whole
 * opening-stock valuation and `cogsDay = 0 − openingValue` would fake a
 * large negative COGS (hence a large positive net) on the first day
 * opening stock is entered. (An `opening` correction dated mid-day is
 * ordinary flow and still counts.)
 *
 * Revenue and expenses are already per-day-additive in
 * `getFinancialSummary`, so they are computed here with the SAME rules:
 *   - restaurant revenue = Σ `Order.total` over LIVE order rows (a row
 *     that a correction supersedes is dropped; the correction row is
 *     kept) whose `occurredAt` is in the day;
 *   - canteen revenue    = Σ `canteen_sale` `MoneyMovement.amount` in the
 *     day (void writes an offsetting negative row, so a plain sum is
 *     live-only);
 *   - expenses           = Σ `Expense.amount` in the day (correction
 *     deltas are same-date rows, so a plain sum folds them).
 *
 * `netDay = revenueDay − cogsDay − expensesDay`, which equals
 * `getFinancialSummary(day, day).consolidated.netProfit` to the cent —
 * proven for several days including a month boundary in
 * `trend-series.test.ts`.
 */

const ZERO = new Prisma.Decimal(0);
const COST_VALUE_ZERO_KINDS = new Set(["dish"]);

export type DailyNet = {
  date: string;
  /** Net profit for that single business date, `Prisma.Decimal`. */
  net: Prisma.Decimal;
  /**
   * Revenue and total expenses for the same day — range-additive parts
   * the week band's delta lines need. `net = revenue − cogs − expenses`;
   * `cogs` is not surfaced (the bars plot `net`, the tiles show
   * revenue / expenses / net).
   */
  revenue: Prisma.Decimal;
  expenses: Prisma.Decimal;
};

/**
 * Net profit for every business date in `[from, to]` inclusive (both
 * `YYYY-MM-DD`, Africa/Nairobi), oldest first. Fixed query count
 * regardless of span length.
 */
export async function dailyNetSeries(
  from: string,
  to: string,
): Promise<DailyNet[]> {
  const spanStart = businessDateStartUtc(from);
  const spanEnd = businessDateEndUtc(to);

  // The list of business dates to emit, in order.
  const dates: string[] = [];
  for (let d = from; d <= to; d = addBusinessDays(d, 1)) dates.push(d);

  const [products, movements, orders, canteenSales, expenses] =
    await Promise.all([
      prisma.product.findMany({
        select: { id: true, kind: true, buyingPrice: true },
      }),
      // EVERY movement in the span — bucketed by day below. `movementType`
      // tells us which rows also count toward the purchases term.
      prisma.stockMovement.findMany({
        where: { occurredAt: { gte: spanStart, lt: spanEnd } },
        select: {
          productId: true,
          quantity: true,
          movementType: true,
          occurredAt: true,
        },
      }),
      prisma.order.findMany({
        where: { occurredAt: { gte: spanStart, lt: spanEnd } },
        select: { id: true, total: true, occurredAt: true },
      }),
      // Canteen revenue: same rule as `getFinancialSummary` — a
      // `canteen_sale` row is only counted when its `StockCount` resolves
      // to a location. A plain sum would differ from the financials
      // screen for an orphan row; the inner-join `where` matches it.
      prisma.moneyMovement.findMany({
        where: {
          sourceType: "canteen_sale",
          occurredAt: { gte: spanStart, lt: spanEnd },
          sourceId: { not: null },
        },
        select: { amount: true, occurredAt: true, sourceId: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: spanStart, lt: spanEnd } },
        select: { amount: true, date: true },
      }),
    ]);

  // Which orders in the span are superseded by a correction row, and
  // which `canteen_sale` rows resolve to a real `StockCount` location
  // (both mirror `getFinancialSummary`'s live-only revenue rules). One
  // batched query each — not per row.
  const countIds = [
    ...new Set(
      canteenSales
        .map((s) => s.sourceId)
        .filter((v): v is string => v != null),
    ),
  ];
  const [supersedingRows, resolvedCounts] = await Promise.all([
    prisma.order.findMany({
      where: { correctsOrderId: { in: orders.map((o) => o.id) } },
      select: { correctsOrderId: true },
    }),
    countIds.length > 0
      ? prisma.stockCount.findMany({
          where: { id: { in: countIds } },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
  ]);
  const supersededOrderIds = new Set(
    supersedingRows.map((r) => r.correctsOrderId as string),
  );
  const resolvedCountIds = new Set(resolvedCounts.map((c) => c.id));

  const costValueById = new Map<string, Prisma.Decimal>(
    products.map((p) => [
      p.id,
      COST_VALUE_ZERO_KINDS.has(p.kind) ? ZERO : p.buyingPrice ?? ZERO,
    ]),
  );

  type Bucket = {
    revenue: Prisma.Decimal;
    /** Σ value of ALL movements that day (telescoped opening/closing). */
    movementValue: Prisma.Decimal;
    /** Σ value of `purchase_receipt` movements that day. */
    purchaseValue: Prisma.Decimal;
    expenses: Prisma.Decimal;
  };
  const buckets = new Map<string, Bucket>();
  const bucket = (date: string): Bucket => {
    let b = buckets.get(date);
    if (!b) {
      b = {
        revenue: ZERO,
        movementValue: ZERO,
        purchaseValue: ZERO,
        expenses: ZERO,
      };
      buckets.set(date, b);
    }
    return b;
  };

  for (const m of movements) {
    const date = toBusinessDate(m.occurredAt);
    // Opening-boundary carve-out (see header): an `opening` row dated
    // exactly at its business-day start is carried-in balance, not that
    // day's flow — `getFinancialSummary` puts it in the opening term, so
    // it must NOT land in this day's `movementValue`.
    if (
      m.movementType === "opening" &&
      m.occurredAt.getTime() === businessDateStartUtc(date).getTime()
    ) {
      continue;
    }
    const b = bucket(date);
    const value = m.quantity.mul(costValueById.get(m.productId) ?? ZERO);
    b.movementValue = b.movementValue.add(value);
    if (m.movementType === "purchase_receipt") {
      b.purchaseValue = b.purchaseValue.add(value);
    }
  }
  for (const o of orders) {
    if (supersededOrderIds.has(o.id)) continue;
    const b = bucket(toBusinessDate(o.occurredAt));
    b.revenue = b.revenue.add(o.total);
  }
  for (const s of canteenSales) {
    if (!s.sourceId || !resolvedCountIds.has(s.sourceId)) continue;
    const b = bucket(toBusinessDate(s.occurredAt));
    b.revenue = b.revenue.add(s.amount);
  }
  for (const e of expenses) {
    const b = bucket(toBusinessDate(e.date));
    b.expenses = b.expenses.add(e.amount);
  }

  return dates.map((date) => {
    const b = buckets.get(date);
    if (!b) {
      return { date, net: ZERO, revenue: ZERO, expenses: ZERO };
    }
    // cogsDay = purchases − Σ(all movement value in day)   (see header)
    const cogs = b.purchaseValue.sub(b.movementValue);
    const net = b.revenue.sub(cogs).sub(b.expenses);
    return { date, net, revenue: b.revenue, expenses: b.expenses };
  });
}
