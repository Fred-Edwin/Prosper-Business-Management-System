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
 * with `correctsOrderId` exposed — simplest for M2; the Session 6 screen
 * badges it and can link original ↔ correction. No margin / cost /
 * buyingPrice / profit field appears in any row (an `OrderView` has none).
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
    include: { lines: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(toOrderView);
}
