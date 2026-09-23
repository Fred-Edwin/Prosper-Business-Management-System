import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { correctCanteenDebt } from "@/lib/domain/customers";
import { DomainError } from "./errors";
import { ZERO, moneyString, quantityString, toQuantity } from "./internal";
import { assertCanteenStockAvailable } from "./record-canteen-credit-sale";
import type {
  ActorContext,
  CorrectCanteenCreditSaleInput,
  CorrectCanteenCreditSaleResult,
} from "./types";

type Tx = Prisma.TransactionClient;

/**
 * Load the original canteen credit-sale `StockMovement` and its linked
 * `Debt`, running the shared guards: it exists, it's a credit-sale row
 * (`customerId` set), and it isn't itself a correction (corrections don't
 * chain — same rule as `Repayment`/ADR-15).
 */
async function loadCorrectable(tx: Tx, stockMovementId: string) {
  const original = await tx.stockMovement.findUnique({
    where: { id: stockMovementId },
    select: {
      id: true,
      productId: true,
      locationId: true,
      customerId: true,
      occurredAt: true,
      correctsMovementId: true,
      quantity: true,
      product: { select: { name: true } },
    },
  });
  if (!original || original.customerId === null) {
    throw new DomainError(
      "NOT_FOUND",
      "Canteen credit sale not found.",
      "stockMovementId",
    );
  }
  if (original.correctsMovementId !== null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This row is itself a correction. Correct the original credit sale instead.",
      "stockMovementId",
    );
  }
  const debt = await tx.debt.findFirst({
    where: { sourceType: "canteen_credit_sale", sourceId: original.id },
    select: { id: true, customerId: true, amount: true },
  });
  if (!debt) {
    throw new DomainError(
      "NOT_FOUND",
      "The debt for this credit sale was not found.",
    );
  }
  return { original, debt };
}

/** Current derived quantity/amount = original + Σ correction deltas. */
async function currentDerived(
  tx: Tx,
  original: { id: string; quantity: Prisma.Decimal },
  debtSourceId: string,
) {
  const [quantityDeltas, amountDeltas] = await Promise.all([
    tx.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { correctsMovementId: original.id },
    }),
    tx.debt.aggregate({
      _sum: { amount: true },
      where: { sourceType: "canteen_credit_sale", sourceId: debtSourceId },
    }),
  ]);
  // original.quantity is negative (stock left); corrections return stock
  // (positive) as they reduce the sale, so subtract their sum.
  const quantity = original.quantity
    .negated()
    .sub(quantityDeltas._sum.quantity ?? ZERO);
  const amount = amountDeltas._sum.amount ?? ZERO;
  return { quantity, amount };
}

/**
 * Correct a canteen credit sale's quantity (ADR-72/ADR-91). **Admin only**
 * — enforced here (not day-close gated, matching `correctRepayment`: an
 * Admin correction row may always be written).
 *
 * `input.quantity` is the corrected FINAL quantity. The corrected amount
 * uses the **original sale's per-unit price** (`Debt.amount ÷ quantity` at
 * the time of the original sale — the first `AuditLog.newValue.unitPrice`
 * for this row) — a correction restates what happened, never re-prices at
 * today's canteen selling price.
 *
 * In one transaction:
 *   1. load + guard the original (`loadCorrectable`);
 *   2. compute the signed quantity delta vs. the row's current derived
 *      quantity; zero delta → `VALIDATION_ERROR` (idempotent);
 *   3. if the delta increases the sale, re-run the §3.8-style stock check;
 *   4. write ONE correction `StockMovement` (`correctsMovementId` set,
 *      `quantity: -delta`, same `occurredAt`) and ONE correction `Debt`
 *      (`amount = delta × originalUnitPrice`, via `correctCanteenDebt`);
 *   5. `AuditLog action: "correct"`, `oldValue`/`newValue` sharing scalar
 *      keys (the ADR-72-correct shape — not `correctExpense`'s
 *      newValue-only shape).
 */
export async function correctCanteenCreditSale(
  input: CorrectCanteenCreditSaleInput,
  actor: ActorContext,
): Promise<CorrectCanteenCreditSaleResult> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct a canteen credit sale.",
    );
  }

  const correctedQuantity = toQuantity(input.quantity, "quantity");

  return prisma.$transaction(async (tx) => {
    const { original, debt } = await loadCorrectable(tx, input.stockMovementId);

    const firstAudit = await tx.auditLog.findFirst({
      where: { entityType: "canteen_credit_sale", entityId: original.id, action: "create" },
      select: { newValue: true },
    });
    const originalUnitPriceRaw = (firstAudit?.newValue as { unitPrice?: string } | null)
      ?.unitPrice;
    if (!originalUnitPriceRaw) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The original sale's price could not be found.",
      );
    }
    const originalUnitPrice = new Prisma.Decimal(originalUnitPriceRaw);

    const derived = await currentDerived(tx, original, original.id);
    const quantityDelta = correctedQuantity.sub(derived.quantity);

    if (quantityDelta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected quantity is the same as the current one.",
        "quantity",
      );
    }

    if (quantityDelta.greaterThan(ZERO)) {
      await assertCanteenStockAvailable(
        tx,
        original.productId,
        original.locationId,
        original.product.name,
        quantityDelta,
      );
    }

    const amountDelta = quantityDelta.mul(originalUnitPrice).toDecimalPlaces(2);

    const correction = await tx.stockMovement.create({
      data: {
        productId: original.productId,
        locationId: original.locationId,
        movementType: "sale",
        quantity: quantityDelta.negated(),
        customerId: original.customerId,
        recordedById: actor.userId,
        occurredAt: original.occurredAt,
        correctsMovementId: original.id,
      },
    });

    await correctCanteenDebt(
      {
        customerId: debt.customerId,
        sourceId: original.id,
        amount: amountDelta,
        occurredAt: original.occurredAt,
      },
      { tx },
    );

    const newQuantity = correctedQuantity;
    const newTotal = derived.amount.add(amountDelta);

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "correct",
        entityType: "canteen_credit_sale",
        entityId: original.id,
        oldValue: {
          quantity: quantityString(derived.quantity),
          total: moneyString(derived.amount),
        },
        newValue: {
          quantity: quantityString(newQuantity),
          total: moneyString(newTotal),
          unitPrice: moneyString(originalUnitPrice),
          correctionId: correction.id,
        },
        occurredAt: original.occurredAt,
      },
    });

    return {
      stockMovementId: correction.id,
      quantity: quantityString(newQuantity),
      total: moneyString(newTotal),
    };
  });
}
