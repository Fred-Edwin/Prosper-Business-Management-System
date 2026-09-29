import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc, toBusinessDate } from "@/lib/time";
import { DomainError } from "./errors";
import { moneyString, quantityString } from "./internal";
import type { ActorContext, ListSaleAdjustmentsFilter, SaleAdjustmentView } from "./types";

/**
 * Owner sale adjustments (ADR-92) in an inclusive business-date range,
 * newest first. **Admin only.** One row per `sale_adjustment`
 * `MoneyMovement` joined to its paired `sale` `StockMovement`. That pair
 * is what `adjustSold` writes, and what the legacy-Sold repair script
 * writes for pre-ADR-92 edits. A money row without a paired stock row is
 * skipped, the same inner-join rule the financial summary uses, so this
 * list sums to exactly the adjustment revenue Financials reports.
 *
 * `unitsSold` is signed from the Sold column's point of view: positive =
 * Sold was raised, negative = lowered. `revenue` is the signed money row.
 */
export async function listSaleAdjustments(
  filter: ListSaleAdjustmentsFilter,
  ctx: ActorContext,
): Promise<SaleAdjustmentView[]> {
  if (ctx.role !== "admin") {
    throw new DomainError("FORBIDDEN", "Only an administrator can view sale adjustments.");
  }

  const rows = await prisma.moneyMovement.findMany({
    where: {
      sourceType: "sale_adjustment",
      stockMovementId: { not: null },
      occurredAt: {
        gte: businessDateStartUtc(filter.from),
        lt: businessDateEndUtc(filter.to),
      },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      amount: true,
      occurredAt: true,
      recordedBy: { select: { name: true } },
      stockMovement: {
        select: {
          id: true,
          quantity: true,
          note: true,
          product: { select: { id: true, name: true, unitLabel: true } },
          location: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  const views: SaleAdjustmentView[] = [];
  for (const r of rows) {
    const sm = r.stockMovement;
    if (!sm) continue;
    views.push({
      id: r.id,
      stockMovementId: sm.id,
      businessDate: toBusinessDate(r.occurredAt),
      occurredAt: r.occurredAt.toISOString(),
      productId: sm.product.id,
      productName: sm.product.name,
      unitLabel: sm.product.unitLabel,
      locationId: sm.location.id,
      locationName: sm.location.name,
      locationType: sm.location.type,
      unitsSold: quantityString(sm.quantity.negated()),
      revenue: moneyString(r.amount),
      note: sm.note,
      recordedByName: r.recordedBy.name,
    });
  }
  return views;
}
