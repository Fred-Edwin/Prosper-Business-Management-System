import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toBusinessDate } from "@/lib/time";
import { recordMoneyMovement } from "@/lib/domain/financials";
import type {
  ActorContext,
  RecordStockCountInput,
  RecordStockCountResult,
} from "./types";
import { DomainError } from "./errors";
import { ZERO, moneyString, quantityString } from "./internal";
import {
  assertCanteenLocation,
  resolveCanteenSellingPrice,
} from "./canteen-guards";

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

  let counted: Prisma.Decimal;
  try {
    counted = new Prisma.Decimal(input.countedQuantity);
  } catch {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Counted quantity must be a number.",
      "countedQuantity",
    );
  }
  if (!counted.isFinite() || counted.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Counted quantity must be zero or more.",
      "countedQuantity",
    );
  }

  const occurredAt = input.occurredAt ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!product || product.deletedAt) {
      throw new DomainError("NOT_FOUND", "Product not found.", "productId");
    }
    await assertCanteenLocation(tx, locationId);

    const sellingPrice = await resolveCanteenSellingPrice(
      tx,
      input.productId,
      locationId,
      product.name,
    );

    // Previous count for this product at this canteen bounds the period.
    const prev = await tx.stockCount.findFirst({
      where: {
        productId: input.productId,
        locationId,
        occurredAt: { lt: occurredAt },
      },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    });

    // A later (or same-instant) count already exists → the new count
    // can't define a forward period.
    const laterCount = await tx.stockCount.findFirst({
      where: {
        productId: input.productId,
        locationId,
        occurredAt: { gte: occurredAt },
      },
      select: { id: true },
    });
    if (laterCount) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "A later count already exists for this product — counts must move forward in time.",
        "occurredAt",
      );
    }

    // expectedRemaining = signed Σ of every StockMovement for
    // (product, canteen) up to this count, read on `tx` so two
    // concurrent counts can't both pass a stale read.
    const agg = await tx.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        productId: input.productId,
        locationId,
        occurredAt: { lte: occurredAt },
      },
    });
    const expectedRemaining = agg._sum.quantity ?? ZERO;
    const sold = expectedRemaining.sub(counted);

    if (sold.isNegative()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `Counted quantity exceeds expected stock by ${quantityString(
          sold.abs(),
        )} — record the missing receipt or transfer first, then recount.`,
        "countedQuantity",
      );
    }

    const revenue = sold.mul(sellingPrice).toDecimalPlaces(2);

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
        periodStart: prev ? prev.occurredAt.toISOString() : null,
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
