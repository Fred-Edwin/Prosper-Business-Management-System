import { prisma } from "@/lib/db";
import { toBusinessDate } from "@/lib/time";
import { recordMoneyMovement } from "@/lib/domain/financials";
import type {
  ActorContext,
  RecordStockCountInput,
  RecordStockCountResult,
  PreviewStockCountInput,
  StockCountPreview,
} from "./types";
import { DomainError } from "./errors";
import { moneyString, quantityString } from "./internal";
import {
  deriveStockCount,
  overCountError,
  parseCountedQuantity,
} from "./derive-stock-count";

/**
 * Record a canteen stock count and derive the sale for the period since
 * that product's previous count (M2-F3, ADR-16).
 *
 * `ctx.role` is `canteen_attendant` (enforced at the route); `ctx.locationId`
 * is the attendant's canteen (`resolveActorLocationId`).
 *
 * One `prisma.$transaction`:
 *   1. validate — product exists; it's sold at the canteen (active
 *      `ProductLocation` with a non-null `sellingPrice`, snapshotted);
 *      `countedQuantity` parses to a `Decimal` >= 0; `occurredAt`
 *      (default now) is strictly after the product's previous
 *      `StockCount.occurredAt` at this canteen.
 *   2. derive — `expectedRemaining` = the signed sum of every
 *      `StockMovement.quantity` for (product, canteen) with
 *      `occurredAt <= thisOccurredAt`, read ON `tx`. `sold =
 *      expectedRemaining − countedQuantity`. **`sold < 0` (counted more
 *      than expected) → `VALIDATION_ERROR`, nothing written** (owner
 *      decision 2026-08-30: reject, and let the attendant undo the count
 *      same-day instead — see `voidStockCount`).
 *   3. write — the `StockCount` row; one `sale` `StockMovement`
 *      (`quantity: -sold`, `stockCountId` set) so canteen sales sum into
 *      the same derived-balance / reporting paths as Restaurant sales;
 *      a revenue `MoneyMovement` (`sold × sellingPrice`, `account: "cash"`,
 *      `sourceType: "canteen_sale"`, `sourceId` = the count id) unless
 *      `sold === 0` (no zero-value money row); one `AuditLog` row.
 *
 * Closing stock is **not** a written row (ADR-11): after the `sale` row,
 * the derived balance `asOf thisOccurredAt` equals `countedQuantity`
 * automatically (`expectedRemaining − sold`).
 *
 * The module is shaped so a later `correctStockCount` (ADR-15 — a new
 * `StockCount` + offsetting rows) can drop in; the schema has no
 * `corrects_stock_count_id` column today and this session does not add one.
 */
export async function recordStockCount(
  input: RecordStockCountInput,
  ctx: ActorContext,
): Promise<RecordStockCountResult> {
  if (!ctx.locationId) {
    throw new DomainError(
      "FORBIDDEN",
      "Your account is not assigned to a canteen.",
    );
  }
  const locationId = ctx.locationId;

  const counted = parseCountedQuantity(input.countedQuantity);
  const occurredAt = input.occurredAt ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    // The ONE derivation — read on `tx` so two concurrent counts can't
    // both pass a stale balance read.
    const d = await deriveStockCount(tx, {
      productId: input.productId,
      locationId,
      countedQuantity: counted,
      occurredAt,
    });

    // The shelf holds more than the ledger accounts for → reject, nothing
    // written (owner decision 2026-08-30; the preview surfaces the same
    // block without a write, `voidStockCount` is the same-day recovery).
    if (d.exceedsExpectedBy) {
      throw overCountError(d.exceedsExpectedBy);
    }

    const sold = d.unitsSold;
    const revenue = d.revenue;

    const count = await tx.stockCount.create({
      data: {
        productId: input.productId,
        locationId,
        countedById: ctx.userId,
        countedQuantity: counted,
        occurredAt,
      },
    });

    // `sale` StockMovement — negative (stock leaves as a sale). `sold`
    // may be 0; write the row anyway for a uniform audit trail.
    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId,
        movementType: "sale",
        quantity: sold.negated(),
        stockCountId: count.id,
        recordedById: ctx.userId,
        occurredAt,
      },
    });

    // Revenue MoneyMovement — skip the zero-value row when nothing sold.
    if (!sold.isZero()) {
      await recordMoneyMovement(
        {
          account: "cash",
          amount: revenue,
          sourceType: "canteen_sale",
          sourceId: count.id,
          occurredAt,
        },
        { actorId: ctx.userId, tx },
      );
    }

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "create",
        entityType: "stock_count",
        entityId: count.id,
        newValue: {
          countedQuantity: quantityString(counted),
          sold: quantityString(sold),
          revenue: moneyString(revenue),
        },
        occurredAt,
      },
    });

    return {
      count: {
        id: count.id,
        productId: count.productId,
        locationId: count.locationId,
        countedById: count.countedById,
        countedQuantity: quantityString(count.countedQuantity),
        occurredAt: count.occurredAt.toISOString(),
        createdAt: count.createdAt.toISOString(),
      },
      derivedSale: {
        unitsSold: quantityString(sold),
        revenue: moneyString(revenue),
        periodStart: d.periodStart ? d.periodStart.toISOString() : null,
        periodEnd: occurredAt.toISOString(),
      },
    };
  });

  return result;
}

/**
 * Undo a stock count the attendant recorded **today** (Africa/Nairobi).
 * A count cannot be edited — it is deleted and re-recorded. This is a
 * **hard delete** of the same-day count and everything it wrote (owner
 * decision 2026-08-30): the `canteen_sale` `MoneyMovement`, the `sale`
 * `StockMovement`, then the `StockCount`. A `hard_delete` `AuditLog` row
 * is written (its `entityId` is the now-gone count id).
 *
 * `FORBIDDEN` if the count belongs to another user, or its business day
 * has rolled — after that only an Admin correction path (a later
 * session) can touch it.
 */
export async function voidStockCount(
  countId: string,
  ctx: ActorContext,
): Promise<{ voided: true }> {
  if (!ctx.locationId) {
    throw new DomainError(
      "FORBIDDEN",
      "Your account is not assigned to a canteen.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const count = await tx.stockCount.findUnique({
      where: { id: countId },
      select: {
        id: true,
        locationId: true,
        countedById: true,
        occurredAt: true,
      },
    });
    if (!count) {
      throw new DomainError("NOT_FOUND", "Stock count not found.");
    }
    if (count.countedById !== ctx.userId || count.locationId !== ctx.locationId) {
      throw new DomainError("FORBIDDEN", "You can only undo your own stock counts.");
    }
    if (toBusinessDate(count.occurredAt) !== toBusinessDate(new Date())) {
      throw new DomainError(
        "FORBIDDEN",
        "This day is closed — ask an administrator to correct this count.",
      );
    }

    // M3 swaps this business-date equality check for a real `DayClose`
    // gate; the delete cascade below is unchanged.
    await tx.moneyMovement.deleteMany({
      where: { sourceType: "canteen_sale", sourceId: countId },
    });
    await tx.stockMovement.deleteMany({ where: { stockCountId: countId } });
    await tx.stockCount.delete({ where: { id: countId } });

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "hard_delete",
        entityType: "stock_count",
        entityId: countId,
        occurredAt: new Date(),
      },
    });
  });

  return { voided: true };
}

/**
 * Dry-run the canteen derived-sale for a counted-remaining value **without
 * persisting anything** — no `StockCount`, no `sale` `StockMovement`, no
 * `MoneyMovement`, no `AuditLog`. Feeds the K1 preview card
 * (`canteen-derived-sales-flow.md` rule 2) so the attendant sees the
 * exact `sold` / `revenue` the commit will produce.
 *
 * Runs the SAME `deriveStockCount` calculation as `recordStockCount`, on
 * the bare `prisma` client (a plain read). Role scoping is identical —
 * enforced at the route (`canteen_attendant` own canteen + `admin`);
 * `ctx.locationId` must be set for an attendant.
 *
 *   - product / canteen / later-count validation → the same `DomainError`
 *     as `recordStockCount` (so a bad `productId` fails the same way).
 *   - counted MORE than expected → `blocked: true` + `exceedsExpectedBy`
 *     (NOT thrown) so the screen can render the blocked state without a
 *     write. `recordStockCount` would reject the same input.
 */
export async function previewStockCount(
  input: PreviewStockCountInput,
  ctx: ActorContext,
): Promise<StockCountPreview> {
  if (!ctx.locationId) {
    throw new DomainError(
      "FORBIDDEN",
      "Your account is not assigned to a canteen.",
    );
  }

  const counted = parseCountedQuantity(input.countedRemaining);
  const occurredAt = input.occurredAt ?? new Date();

  const d = await deriveStockCount(prisma, {
    productId: input.productId,
    locationId: ctx.locationId,
    countedQuantity: counted,
    occurredAt,
  });

  if (d.exceedsExpectedBy) {
    return {
      blocked: true,
      exceedsExpectedBy: quantityString(d.exceedsExpectedBy),
      isFirstCount: d.isFirstCount,
      periodStart: d.periodStart ? d.periodStart.toISOString() : null,
      lastCountedAt: d.lastCountedAt ? d.lastCountedAt.toISOString() : null,
      daysSincePrevious: d.daysSincePrevious,
      countedRemaining: quantityString(counted),
      unitsSold: null,
      revenue: null,
      closingStockWillBe: quantityString(d.closingStockWillBe),
    };
  }

  return {
    blocked: false,
    exceedsExpectedBy: null,
    isFirstCount: d.isFirstCount,
    periodStart: d.periodStart ? d.periodStart.toISOString() : null,
    lastCountedAt: d.lastCountedAt ? d.lastCountedAt.toISOString() : null,
    daysSincePrevious: d.daysSincePrevious,
    countedRemaining: quantityString(counted),
    unitsSold: quantityString(d.unitsSold),
    revenue: moneyString(d.revenue),
    closingStockWillBe: quantityString(d.closingStockWillBe),
  };
}
