import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import type { DashboardToday } from "./types";

const ZERO = new Prisma.Decimal(0);

/**
 * Band 4 of the dashboard — a readout of what has happened so far on the
 * current business date. All counts are for `[todayStart, todayEnd)` in
 * Africa/Nairobi.
 *
 *   - `salesSoFar` — money IN today from restaurant orders + canteen
 *     sales: `Σ MoneyMovement.amount` where `sourceType ∈ {order,
 *     canteen_sale}`. (Matches the design's "money in from `order` +
 *     `canteen_sale` MoneyMovement today".)
 *   - `stockMovementCount` — rows in `StockMovement` today.
 *   - `purchaseReceiptCount` — of those, `movementType =
 *     "purchase_receipt"`.
 *   - `handoversReceived` / `handoversDue` — handovers dated today with /
 *     without a receipt (correction rows excluded).
 *   - `correctionCountToday` — `AuditLog` rows today with `action =
 *     "correct"`.
 */
export async function getTodaysActivity(
  today: string,
): Promise<DashboardToday> {
  const start = businessDateStartUtc(today);
  const end = businessDateEndUtc(today);

  const [
    salesAgg,
    stockMovementCount,
    purchaseReceiptCount,
    handoversReceived,
    handoversDue,
    correctionCountToday,
  ] = await Promise.all([
    prisma.moneyMovement.aggregate({
      _sum: { amount: true },
      where: {
        sourceType: { in: ["order", "canteen_sale"] },
        occurredAt: { gte: start, lt: end },
      },
    }),
    prisma.stockMovement.count({
      where: { occurredAt: { gte: start, lt: end } },
    }),
    prisma.stockMovement.count({
      where: {
        movementType: "purchase_receipt",
        occurredAt: { gte: start, lt: end },
      },
    }),
    prisma.handover.count({
      where: {
        correctsHandoverId: null,
        occurredAt: { gte: start, lt: end },
        receipts: { some: {} },
      },
    }),
    prisma.handover.count({
      where: {
        correctsHandoverId: null,
        occurredAt: { gte: start, lt: end },
        receipts: { none: {} },
      },
    }),
    prisma.auditLog.count({
      where: { action: "correct", occurredAt: { gte: start, lt: end } },
    }),
  ]);

  return {
    date: today,
    salesSoFar: (salesAgg._sum.amount ?? ZERO).toFixed(2),
    stockMovementCount,
    purchaseReceiptCount,
    handoversReceived,
    handoversDue,
    correctionCountToday,
  };
}
