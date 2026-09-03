import { prisma } from "@/lib/db";
import {
  businessDateStartUtc,
  businessDateEndUtc,
  businessDateOnly,
} from "@/lib/time";
import { listOrders } from "@/lib/domain/sales";
import { listMovements } from "@/lib/domain/stock";
import { listHandovers } from "@/lib/domain/handovers";
import { listExpenses, listOwnerTransactions } from "@/lib/domain/financials";
import { DomainError } from "./errors";
import type {
  DayDetailView,
  DayDetailStockCount,
  DayDetailPayout,
} from "./types";

const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Everything that happened on ONE Africa/Nairobi business date, in one
 * read (M5 S11). Admin-only — enforced at the route; this function is
 * always called with an `admin` actor.
 *
 * ── Composed, not re-queried ─────────────────────────────────────────
 * Orders, stock movements, handovers (+ their receipts), expenses and
 * owner transactions come from the EXISTING per-module reads, called
 * with an `admin` context and `date` / `from+to` set to `businessDate`.
 * Those reads already fold correction deltas, drop superseded rows and
 * carry the joins the screens need — so the day-detail screen reuses
 * their mappers unchanged.
 *
 * ── Two direct queries (documented) ─────────────────────────────────
 * `stockCount` and `staffPayout` have NO date-scoped domain read of
 * their own, so this file queries them directly:
 *   - `stockCount` — windowed on `occurredAt` in `[start, end)`.
 *   - `staffPayout` — its business date is the `@db.Date` `date` column;
 *     matched with `businessDateOnly(businessDate)`.
 * Both use a single `findMany` with `include` (no N+1).
 *
 * ── Empty date ─────────────────────────────────────────────────────
 * A quiet date returns every collection as `[]` and `closed: false` —
 * never an error.
 */
export async function getDayDetail(
  businessDate: string,
): Promise<DayDetailView> {
  if (!BUSINESS_DATE_RE.test(businessDate)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "businessDate must be a YYYY-MM-DD business date.",
      "businessDate",
    );
  }

  const adminCtx = { userId: "__day_detail_admin__", role: "admin" as const };

  const start = businessDateStartUtc(businessDate);
  const end = businessDateEndUtc(businessDate);
  const dateOnly = businessDateOnly(businessDate);

  const [
    orders,
    stockMovements,
    handovers,
    expenses,
    ownerTransactions,
    stockCountRows,
    payoutRows,
    dayClose,
  ] = await Promise.all([
    listOrders({ date: businessDate }, { ...adminCtx, locationId: null }),
    listMovements({ date: businessDate }, { ...adminCtx, locationId: null }),
    listHandovers({ date: businessDate }, adminCtx),
    listExpenses({ from: businessDate, to: businessDate }),
    listOwnerTransactions({ from: businessDate, to: businessDate }),
    prisma.stockCount.findMany({
      where: { occurredAt: { gte: start, lt: end } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      include: {
        product: { select: { name: true } },
        location: { select: { name: true } },
        countedBy: { select: { name: true } },
      },
    }),
    prisma.staffPayout.findMany({
      where: { date: dateOnly },
      orderBy: { createdAt: "desc" },
      include: {
        staff: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.dayClose.findUnique({ where: { date: dateOnly } }),
  ]);

  const closedByName = dayClose
    ? (
        await prisma.user.findUnique({
          where: { id: dayClose.closedBy },
          select: { name: true },
        })
      )?.name ?? null
    : null;

  const stockCounts: DayDetailStockCount[] = stockCountRows.map((c) => ({
    id: c.id,
    productName: c.product?.name ?? "?",
    locationName: c.location?.name ?? "?",
    countedQuantity: c.countedQuantity.toFixed(4),
    occurredAt: c.occurredAt.toISOString(),
    countedByName: c.countedBy?.name ?? null,
  }));

  const payouts: DayDetailPayout[] = payoutRows.map((p) => ({
    id: p.id,
    staffName: p.staff?.name ?? null,
    month: p.month.toISOString().slice(0, 7),
    netPaid: p.netPaid.toFixed(2),
    paidFromAccount: p.paidFromAccount,
    expenseId: p.expenseId,
    recordedByName: p.recordedBy?.name ?? null,
  }));

  return {
    businessDate,
    closed: dayClose !== null,
    closedBy: dayClose?.closedBy ?? null,
    closedByName,
    closedAt: dayClose?.closedAt.toISOString() ?? null,
    orders,
    stockMovements,
    handovers,
    expenses,
    ownerTransactions,
    stockCounts,
    payouts,
  };
}
