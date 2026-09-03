import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addBusinessDays,
  businessDateOnly,
  businessDateStartUtc,
  toBusinessDate,
} from "@/lib/time";
import type { DashboardNeedsAttention } from "./types";

const ZERO = new Prisma.Decimal(0);

/**
 * How far back the "days still open before today" check looks for
 * activity. A business that closes daily never has an older gap; a longer
 * lookback would only surface dates from before the business used the
 * system. 60 days is comfortably long enough to nag about a real miss.
 */
const OPEN_PRIOR_LOOKBACK_DAYS = 60;

/** The negative part of a variance, as a positive magnitude. */
function shortPart(v: Prisma.Decimal): Prisma.Decimal {
  return v.isNegative() ? v.abs() : ZERO;
}

/**
 * Band 3 of the dashboard — everything that could need the owner before
 * they close. All four queues empty (and every count zero) is the "all
 * clear" state, returned as empty collections, never an error.
 *
 * `today` is the current Africa/Nairobi business date.
 */
export async function getNeedsAttention(
  today: string,
): Promise<DashboardNeedsAttention> {
  const lookbackFrom = addBusinessDays(today, -OPEN_PRIOR_LOOKBACK_DAYS);
  const lookbackStart = businessDateStartUtc(lookbackFrom);
  const todayStart = businessDateStartUtc(today);

  const [
    orderDates,
    handoverDates,
    movementDates,
    expenseDates,
    closes,
    openHandoverRows,
    shortfallRows,
  ] = await Promise.all([
    // Distinct-ish activity timestamps in [lookback, today) — bucketed to
    // business dates below. `distinct` on `occurredAt` still returns one
    // row per instant, so we select the raw column and dedupe in memory;
    // the window is bounded (≤ 60 days of human activity).
    prisma.order.findMany({
      where: { occurredAt: { gte: lookbackStart, lt: todayStart } },
      select: { occurredAt: true },
    }),
    prisma.handover.findMany({
      where: { occurredAt: { gte: lookbackStart, lt: todayStart } },
      select: { occurredAt: true },
    }),
    prisma.stockMovement.findMany({
      where: { occurredAt: { gte: lookbackStart, lt: todayStart } },
      select: { occurredAt: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: lookbackStart, lt: todayStart } },
      select: { date: true },
    }),
    prisma.dayClose.findMany({
      where: { date: { gte: businessDateOnly(lookbackFrom) } },
      select: { date: true },
    }),
    // Handovers with no receipt yet (declared but not received). Exclude
    // correction rows — they fold into the original's figures.
    prisma.handover.findMany({
      where: { correctsHandoverId: null, receipts: { none: {} } },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        occurredAt: true,
        cashDeclared: true,
        mpesaDeclared: true,
        location: { select: { name: true } },
        staff: { select: { name: true } },
        corrections: {
          select: { cashDeclared: true, mpesaDeclared: true },
        },
      },
    }),
    // EVERY handover shortfall — NOT month-scoped (the design is explicit:
    // all currently open). A `HandoverShortfall` has no "resolved" flag —
    // every row is an open follow-up until settled off-system.
    prisma.handoverShortfall.findMany({
      select: {
        receiptOfHandover: {
          select: { cashVariance: true, mpesaVariance: true },
        },
      },
    }),
  ]);

  // ── openPriorDates ────────────────────────────────────────────────
  const activityDates = new Set<string>();
  for (const r of orderDates) activityDates.add(toBusinessDate(r.occurredAt));
  for (const r of handoverDates) activityDates.add(toBusinessDate(r.occurredAt));
  for (const r of movementDates) activityDates.add(toBusinessDate(r.occurredAt));
  for (const r of expenseDates) activityDates.add(toBusinessDate(r.date));
  const closedDates = new Set(
    closes.map((c) => toBusinessDate(c.date)),
  );
  const openPriorDates = [...activityDates]
    .filter((d) => d < today && !closedDates.has(d))
    .sort();

  // ── handoversAwaitingReceipt ──────────────────────────────────────
  const items = openHandoverRows.map((h) => {
    const declared = h.corrections.reduce(
      (acc, c) => ({
        cash: acc.cash.add(c.cashDeclared),
        mpesa: acc.mpesa.add(c.mpesaDeclared),
      }),
      { cash: h.cashDeclared, mpesa: h.mpesaDeclared },
    );
    return {
      handoverId: h.id,
      locationName: h.location.name,
      staffName: h.staff.name,
      declaredTotal: declared.cash.add(declared.mpesa).toFixed(2),
      occurredAt: h.occurredAt.toISOString(),
    };
  });

  // ── openShortfalls ───────────────────────────────────────────────
  let shortfallTotal = ZERO;
  for (const s of shortfallRows) {
    shortfallTotal = shortfallTotal
      .add(shortPart(s.receiptOfHandover.cashVariance))
      .add(shortPart(s.receiptOfHandover.mpesaVariance));
  }

  // ── lowOrNegativeStock ───────────────────────────────────────────
  const lowStock = await getLowOrNegativeStock();

  return {
    openPriorDates,
    handoversAwaitingReceipt: { count: items.length, items },
    openShortfalls: {
      count: shortfallRows.length,
      total: shortfallTotal.toFixed(2),
    },
    lowOrNegativeStock: lowStock,
  };
}

/**
 * Products at or below zero on-hand at any location, right now. One
 * grouped sum over the whole `StockMovement` ledger (the derived-balance
 * rule — no stored total), then the product/location names for only the
 * offending rows.
 */
async function getLowOrNegativeStock(): Promise<
  DashboardNeedsAttention["lowOrNegativeStock"]
> {
  const grouped = await prisma.stockMovement.groupBy({
    by: ["productId", "locationId"],
    _sum: { quantity: true },
  });
  const low = grouped
    .map((g) => ({
      productId: g.productId,
      locationId: g.locationId,
      qty: g._sum.quantity ?? ZERO,
    }))
    .filter((r) => r.qty.lte(ZERO))
    .sort((a, b) => a.qty.comparedTo(b.qty));

  if (low.length === 0) return { count: 0, top: [] };

  const top3 = low.slice(0, 3);
  const productIds = [...new Set(top3.map((r) => r.productId))];
  const locationIds = [...new Set(top3.map((r) => r.locationId))];
  const [products, locations] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, unitLabel: true },
    }),
    prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    }),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l.name]));

  return {
    count: low.length,
    top: top3.map((r) => ({
      productName: productById.get(r.productId)?.name ?? "?",
      locationName: locationById.get(r.locationId) ?? "?",
      qty: r.qty.toFixed(4),
      unit: productById.get(r.productId)?.unitLabel ?? "",
    })),
  };
}
