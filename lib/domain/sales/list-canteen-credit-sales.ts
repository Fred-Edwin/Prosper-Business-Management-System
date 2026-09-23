import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc, nairobiToday } from "@/lib/time";
import { DomainError } from "./errors";
import { ZERO, moneyString, quantityString } from "./internal";
import type {
  ActorContext,
  CanteenCreditSaleListItem,
  ListCanteenCreditSalesFilter,
} from "./types";

/**
 * List canteen credit sales in a business-date window (default: today) —
 * backs the attendant hub's "today's credit sales" recap + void action
 * (ADR-91). Each row folds in its correction deltas so `quantity`/`total`
 * are the CURRENT derived values, matching `getCustomerLedger`'s fold-in
 * pattern for repayment corrections. A row voided to zero is dropped.
 *
 * Role scope (mirrors `derived-sales.ts`):
 *   - `admin` → every canteen;
 *   - `canteen_attendant` → only their own canteen; `voidable` is true
 *     only for their own same-day rows (the route's day-open check still
 *     applies at void time — this flag is a UX hint, not a guard).
 */
export async function listCanteenCreditSales(
  filter: ListCanteenCreditSalesFilter,
  ctx: ActorContext,
): Promise<CanteenCreditSaleListItem[]> {
  let canteenLocationId: string | undefined;
  if (ctx.role === "canteen_attendant") {
    if (!ctx.locationId) {
      throw new DomainError(
        "FORBIDDEN",
        "Your account is not assigned to a canteen.",
      );
    }
    canteenLocationId = ctx.locationId;
  } else if (ctx.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "You do not have access to canteen credit sales.",
    );
  }

  const date = filter.date ?? nairobiToday();
  const gte = businessDateStartUtc(date);
  const lt = businessDateEndUtc(date);

  const originals = await prisma.stockMovement.findMany({
    where: {
      movementType: "sale",
      customerId: { not: null },
      stockCountId: null,
      correctsMovementId: null,
      occurredAt: { gte, lt },
      ...(canteenLocationId ? { locationId: canteenLocationId } : {}),
    },
    select: {
      id: true,
      productId: true,
      product: { select: { name: true } },
      customerId: true,
      customer: { select: { name: true } },
      quantity: true,
      occurredAt: true,
      recordedById: true,
    },
    orderBy: { occurredAt: "desc" },
  });

  if (originals.length === 0) return [];

  const originalIds = originals.map((o) => o.id);
  const [quantityDeltaRows, amountRows] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["correctsMovementId"],
      where: { correctsMovementId: { in: originalIds } },
      _sum: { quantity: true },
    }),
    prisma.debt.groupBy({
      by: ["sourceId"],
      where: { sourceType: "canteen_credit_sale", sourceId: { in: originalIds } },
      _sum: { amount: true },
    }),
  ]);
  const quantityDeltaById = new Map(
    quantityDeltaRows.map((r) => [r.correctsMovementId as string, r._sum.quantity ?? ZERO]),
  );
  const amountById = new Map(
    amountRows.map((r) => [r.sourceId as string, r._sum.amount ?? ZERO]),
  );

  const today = nairobiToday();
  const items: CanteenCreditSaleListItem[] = [];
  for (const o of originals) {
    const quantity = o.quantity.negated().sub(quantityDeltaById.get(o.id) ?? ZERO);
    const total = amountById.get(o.id) ?? ZERO;
    if (quantity.isZero() && total.isZero()) continue; // voided

    items.push({
      stockMovementId: o.id,
      productId: o.productId,
      productName: o.product.name,
      customerId: o.customerId as string,
      customerName: o.customer?.name ?? "Unknown customer",
      quantity: quantityString(quantity),
      total: moneyString(total),
      occurredAt: o.occurredAt.toISOString(),
      voidable:
        date === today &&
        o.recordedById === ctx.userId &&
        (canteenLocationId === undefined || canteenLocationId === ctx.locationId),
    });
  }
  return items;
}
