import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import { DomainError } from "./errors";
import { toOrderView } from "./internal";
import type { ActorContext, ListOrdersFilter, OrderView } from "./types";

/**
 * List Restaurant orders, role-scoped (mirrors `stock/list-movements.ts`):
 *
 *   - `admin` → all orders; `filter.cashierId` narrows if given.
 *   - `cashier` → forced to their own (`where.cashierId = ctx.userId`); a
 *     `filter.cashierId` that isn't the caller returns `[]` (no error, no
 *     leak — PRD §4.3 "cannot see orders recorded by the other cashier").
 *   - any other role → `FORBIDDEN`.
 *
 * `filter.date` is an Africa/Nairobi business date, windowed on
 * `occurredAt` as `[businessDateStartUtc, businessDateEndUtc)`.
 *
 * Newest first (`occurredAt` desc, then `createdAt` desc). Lines included.
 *
 * A correction row (`correctsOrderId` set) is returned as its **own row**
 * with `correctsOrderId` exposed. The order it SUPERSEDES is **not**
 * returned (owner decision 2026-09-02, F1).
 *
 * Why the exclusion lives here and not on each screen: `correctOrder` writes
 * the correction's `total` as the full recomputed total, not a delta. So a
 * consumer that sums every returned row counts a corrected sale twice — live
 * on 2026-09-01 the Cashier's Today header read "KES 380 · 2 orders" when
 * KES 120 across 1 order had actually been collected, and the Admin sales
 * list double-counted the same way. Filtering in the domain read fixes every
 * consumer at once, present and future, instead of asking each one to
 * remember a flag.
 *
 * This also repairs the "Corrected" chip: a cashier-scoped query returns the
 * original but never the Admin's correction, so nothing could tell a screen
 * that an order had been superseded. The surviving correction row carries
 * `correctsOrderId`, and the audit trail lives in `AuditLog`.
 *
 * No margin / cost / buyingPrice / profit field appears in any row (an
 * `OrderView` has none).
 */
export async function listOrders(
  filter: ListOrdersFilter,
  ctx: ActorContext,
): Promise<OrderView[]> {
  const where: Prisma.OrderWhereInput = {};

  if (ctx.role === "admin") {
    if (filter.cashierId) where.cashierId = filter.cashierId;
  } else if (ctx.role === "cashier") {
    if (filter.cashierId && filter.cashierId !== ctx.userId) return [];
    where.cashierId = ctx.userId;
  } else {
    throw new DomainError("FORBIDDEN", "You do not have access to orders.");
  }

  if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;
  if (filter.orderType) where.orderType = filter.orderType;
  if (filter.date) {
    where.occurredAt = {
      gte: businessDateStartUtc(filter.date),
      lt: businessDateEndUtc(filter.date),
    };
  }

  const rows = await prisma.order.findMany({
    where,
    include: {
      cashier: { select: { name: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  // Drop any order that a correction has superseded. The correction is
  // found WITHOUT the role/date scope of the main query on purpose: a
  // cashier-scoped or single-day read would miss an Admin's correction and
  // let the superseded original back into the totals.
  const supersededIds = new Set(
    (
      await prisma.order.findMany({
        where: { correctsOrderId: { in: rows.map((r) => r.id) } },
        select: { correctsOrderId: true },
      })
    ).map((r) => r.correctsOrderId as string),
  );
  const liveRows = rows.filter((r) => !supersededIds.has(r.id));

  // For any correction row in the result, hydrate "corrected on {date} by
  // {Admin}" from its `AuditLog` `correct` entry (the correction row's own
  // `cashierId` is the *original* cashier, not the acting Admin).
  const correctionIds = liveRows
    .filter((r) => r.correctsOrderId != null)
    .map((r) => r.id);
  const correctedBy = new Map<string, { at: Date; name: string }>();
  if (correctionIds.length > 0) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: "order",
        action: "correct",
        entityId: { in: correctionIds },
      },
      select: {
        entityId: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
    for (const l of logs) {
      // One `correct` row per correction; if somehow more, keep the first.
      // Use `createdAt` (real insert time) — the row's `occurredAt` is
      // backdated to the original's business day by `correctOrder`.
      if (!correctedBy.has(l.entityId)) {
        correctedBy.set(l.entityId, {
          at: l.createdAt,
          name: l.user?.name ?? "an administrator",
        });
      }
    }
  }

  return liveRows.map((r) => toOrderView(r, correctedBy.get(r.id) ?? null));
}
