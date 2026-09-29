import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  businessDateEndUtc,
  businessDateLastInstantUtc,
  businessDateStartUtc,
  nairobiToday,
} from "@/lib/time";
import { recordMoneyMovement } from "@/lib/domain/financials";
import { DomainError } from "./errors";
import { ZERO, moneyString, quantityString } from "./internal";
import type { ActorContext, AdjustSoldInput, AdjustSoldResult } from "./types";

/**
 * Owner sale adjustment (ADR-92): restate a (product, location)'s **Sold
 * total for one business day** from the stock ledger. **Admin only**, any
 * day. Not day-close gated, since only the Admin can write it (same rule as
 * `correctStockBalance`).
 *
 * This is deliberately NOT tied to a specific Order or StockCount. The
 * owner reads the ledger, sees the day's Sold figure doesn't match what
 * happened, and types the right total. The adjustment must move stock
 * **and** revenue together. Before ADR-92 the Sold cell ran the generic
 * `correctMovement`, which wrote a stock-only delta: closing stock moved,
 * revenue didn't, COGS did (so gross profit fell), and at the canteen the
 * next stock count re-derived the units, shifting revenue to another day.
 *
 * `input.correctedSold` is the corrected FINAL Sold total for the day.
 * In one transaction:
 *   1. guard: location is a restaurant or canteen; the product has a
 *      selling price there (revenue needs one); the date isn't in the
 *      future;
 *   2. current Sold = −Σ `sale` StockMovement quantity for the pair in the
 *      day (orders, counts, credit sales and earlier adjustments alike);
 *   3. `delta = correctedSold − currentSold`; zero → `VALIDATION_ERROR`
 *      (idempotent, matches every other correction path);
 *   4. write ONE source-less `sale` StockMovement (`quantity: −delta`: no
 *      orderId / stockCountId / customerId, which is what marks it as an
 *      owner adjustment) and ONE Cash `sale_adjustment` MoneyMovement
 *      (`delta × sellingPrice`, signed, linked by `stockMovementId`);
 *   5. `AuditLog action: "correct"`, `oldValue`/`newValue` sharing `sold`.
 *
 * Dating: today → now; a past day → its last instant, so the row sits
 * after that day's counts and never re-orders them.
 *
 * Priced at the product's **current** selling price at the location: the
 * owner is restating the figure as she'd value it now, and there is no
 * single original sale to take a price snapshot from.
 *
 * No separate `voidSaleAdjustment`. Entering the previous total again is
 * the full undo (the `correctStockBalance` / `setOpeningStock` precedent
 * under ADR-72).
 */
export async function adjustSold(
  input: AdjustSoldInput,
  actor: ActorContext,
): Promise<AdjustSoldResult> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can adjust a sold figure.",
    );
  }

  // Zero is a legitimate target (undo every sale that day), so this can't
  // use `toQuantity`, which requires > 0.
  let corrected: Prisma.Decimal;
  try {
    corrected = new Prisma.Decimal(input.correctedSold);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Sold must be a number.", "correctedSold");
  }
  if (!corrected.isFinite() || corrected.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Sold can't be negative.",
      "correctedSold",
    );
  }

  const today = nairobiToday();
  if (input.businessDate > today) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "You can't adjust sales for a future date.",
      "businessDate",
    );
  }

  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: input.locationId },
      select: { type: true },
    });
    if (!location) {
      throw new DomainError("NOT_FOUND", "Location not found.", "locationId");
    }
    if (location.type === "store") {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Nothing is sold from the store. Adjust sales at the restaurant or canteen.",
        "locationId",
      );
    }

    const pl = await tx.productLocation.findUnique({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.locationId,
        },
      },
      select: { sellingPrice: true, product: { select: { name: true } } },
    });
    if (!pl || pl.sellingPrice == null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This product has no selling price at this location, so a sale can't be valued. Set one in Catalog first.",
        "productId",
      );
    }
    const price = pl.sellingPrice;

    const soldAgg = await tx.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "sale",
        occurredAt: {
          gte: businessDateStartUtc(input.businessDate),
          lt: businessDateEndUtc(input.businessDate),
        },
      },
    });
    const currentSold = (soldAgg._sum.quantity ?? ZERO).negated();

    const delta = corrected.sub(currentSold);
    if (delta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected sold figure is the same as the current one.",
        "correctedSold",
      );
    }

    const occurredAt =
      input.businessDate === today
        ? new Date()
        : businessDateLastInstantUtc(input.businessDate);
    const note = input.note?.trim() || "Owner sale adjustment";

    const stockRow = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "sale",
        quantity: delta.negated(),
        recordedById: actor.userId,
        occurredAt,
        note,
      },
    });

    const revenueDelta = delta.mul(price).toDecimalPlaces(2);
    await recordMoneyMovement(
      {
        account: "cash",
        amount: revenueDelta,
        sourceType: "sale_adjustment",
        sourceId: stockRow.id,
        stockMovementId: stockRow.id,
        occurredAt,
        note,
      },
      { actorId: actor.userId, tx },
    );

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "correct",
        entityType: "sale_adjustment",
        entityId: stockRow.id,
        oldValue: { sold: quantityString(currentSold) },
        newValue: {
          sold: quantityString(corrected),
          unitPrice: moneyString(price),
          revenueDelta: moneyString(revenueDelta),
          product: pl.product.name,
        },
        occurredAt,
      },
    });

    return {
      stockMovementId: stockRow.id,
      sold: quantityString(corrected),
      quantityDelta: quantityString(delta),
      revenueDelta: moneyString(revenueDelta),
      unitPrice: moneyString(price),
    };
  });
}
