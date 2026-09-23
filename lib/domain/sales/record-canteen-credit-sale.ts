import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen, assertStaffDateIsToday } from "@/lib/domain/audit";
import { recordDebt } from "@/lib/domain/customers";
import { DomainError } from "./errors";
import { ZERO, moneyString, quantityString, toQuantity } from "./internal";
import { assertCanteenLocation, resolveCanteenSellingPrice } from "./canteen-guards";
import type { ActorContext, RecordCanteenCreditSaleInput, RecordCanteenCreditSaleResult } from "./types";

/**
 * Record a canteen credit sale — the attendant sells a product to a
 * customer now, on credit, tracked as a `Debt` (ADR-91, overriding the
 * former PRD §4.4 "no credit sales at the canteen" rule).
 *
 * Unlike the stock-count-derived cash-sale path, this is a discrete,
 * real-time transaction (mirrors the Restaurant Cashier's credit-order
 * path — `lib/domain/sales/order-effects.ts`'s credit branch): stock
 * reduces **immediately** via a real `sale` `StockMovement` (no
 * `stockCountId` — that's what distinguishes it from a count-derived sale
 * row), and a `Debt` is created instead of a `MoneyMovement` (no money has
 * moved yet). The immediate `StockMovement` is safe against the next stock
 * count's math: `deriveStockCount` sums ALL `StockMovement` rows for
 * (product, canteen) up to count time, so this row nets in correctly and
 * is never double-counted as "missing" stock.
 *
 * One `prisma.$transaction`:
 *   1. `ctx.locationId` set (attendant's canteen) — `FORBIDDEN` otherwise.
 *   2. staff "today only" (ADR-53) + day-close (ADR-52) gates, same as
 *      `recordStockCount`.
 *   3. `quantity` parses to a positive `Decimal` (`toQuantity`).
 *   4. `assertCanteenLocation` + `resolveCanteenSellingPrice` (snapshotted,
 *      same as a stock count's revenue calc).
 *   5. product exists (not soft-deleted).
 *   6. customer exists. No archived-customer guard — matches the existing
 *      Restaurant credit-order path, which doesn't check `deletedAt`
 *      server-side either (only the picker hides archived customers).
 *   7. §3.8-style BLOCK: `quantity` must not exceed the canteen's current
 *      derived balance for the product (read on `tx`).
 *   8. write the `sale` `StockMovement` (`customerId` set), the `Debt`
 *      (`sourceType: "canteen_credit_sale"`, `sourceId` = the movement's
 *      id), and one `AuditLog` row (`newValue` also carries `unitPrice` so
 *      a later correction can hold the original per-unit price stable
 *      without back-computing it from `amount / quantity`).
 */
export async function recordCanteenCreditSale(
  input: RecordCanteenCreditSaleInput,
  ctx: ActorContext,
): Promise<RecordCanteenCreditSaleResult> {
  if (!ctx.locationId) {
    throw new DomainError(
      "FORBIDDEN",
      "Your account is not assigned to a canteen.",
    );
  }
  const locationId = ctx.locationId;
  const occurredAt = input.occurredAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    assertStaffDateIsToday(occurredAt, ctx);
    await assertDayOpen(occurredAt, tx);

    const quantity = toQuantity(input.quantity, "quantity");

    await assertCanteenLocation(tx, locationId);

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!product || product.deletedAt !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Product not found.",
        "productId",
      );
    }

    const unitPrice = await resolveCanteenSellingPrice(
      tx,
      input.productId,
      locationId,
      product.name,
    );

    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new DomainError("NOT_FOUND", "Customer not found.", "customerId");
    }

    // §3.8-style BLOCK — the canteen's current derived balance for this
    // product must cover the sale (mirrors order-effects.ts's Restaurant
    // stock check, scoped to one product/location instead of a batch).
    await assertCanteenStockAvailable(
      tx,
      input.productId,
      locationId,
      product.name,
      quantity,
    );

    const total = quantity.mul(unitPrice).toDecimalPlaces(2);

    const stockMovement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId,
        movementType: "sale",
        quantity: quantity.negated(),
        customerId: input.customerId,
        recordedById: ctx.userId,
        occurredAt,
      },
    });

    const debt = await recordDebt(
      {
        customerId: input.customerId,
        sourceType: "canteen_credit_sale",
        sourceId: stockMovement.id,
        amount: total,
        occurredAt,
      },
      { tx },
    );

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "create",
        entityType: "canteen_credit_sale",
        entityId: stockMovement.id,
        newValue: {
          productId: input.productId,
          customerId: input.customerId,
          quantity: quantityString(quantity),
          unitPrice: moneyString(unitPrice),
          total: moneyString(total),
        },
        occurredAt,
      },
    });

    return {
      stockMovement: {
        id: stockMovement.id,
        productId: stockMovement.productId,
        locationId: stockMovement.locationId,
        quantity: quantityString(quantity),
        occurredAt: stockMovement.occurredAt.toISOString(),
      },
      debt: {
        id: debt.id,
        customerId: debt.customerId,
        amount: moneyString(debt.amount),
        occurredAt: debt.occurredAt.toISOString(),
      },
      productName: product.name,
      unitPrice: moneyString(unitPrice),
      total: moneyString(total),
    };
  });
}

// Exported so `void-canteen-credit-sale.ts` / `correct-canteen-credit-sale.ts`
// (Admin/attendant correction paths) can reuse the exact same BLOCK
// against a delta rather than re-deriving it.
export async function assertCanteenStockAvailable(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string,
  productName: string,
  quantity: Prisma.Decimal,
): Promise<void> {
  const balance = await tx.stockMovement.aggregate({
    _sum: { quantity: true },
    where: { productId, locationId },
  });
  const available = balance._sum.quantity ?? ZERO;
  if (quantity.greaterThan(available)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Not enough Canteen stock: ${productName} (only ${available.toFixed(4)} in stock at the Canteen). Reduce the quantity.`,
      "quantity",
    );
  }
}
