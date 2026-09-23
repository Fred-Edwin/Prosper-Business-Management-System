import { prisma } from "@/lib/db";
import { assertStaffDateIsToday, isDayClosed } from "@/lib/domain/audit";
import { voidCanteenDebt } from "@/lib/domain/customers";
import { DomainError } from "./errors";
import { ZERO, moneyString, quantityString } from "./internal";
import type { ActorContext } from "./types";

/**
 * Undo a canteen credit sale the attendant recorded **today** (Africa/
 * Nairobi) — same-day, own-row recovery, mirroring `voidStockCount`'s
 * guard set exactly. Unlike `voidStockCount`, this is never a hard delete:
 * by the time of a void the customer may already have made a `Repayment`
 * against their balance, which this `Debt` is part of — always a
 * correction-to-zero (ADR-72/ADR-91), never a row deletion.
 *
 * In one transaction: returns the stock (a correction `StockMovement`,
 * `correctsMovementId` set, `+currentDerivedQuantity`) and zeroes the debt
 * (a correction `Debt` via `voidCanteenDebt`, `−currentDerivedAmount`).
 * `AuditLog action: "soft_delete"`.
 */
export async function voidCanteenCreditSale(
  stockMovementId: string,
  ctx: ActorContext,
): Promise<{ voided: true }> {
  if (!ctx.locationId) {
    throw new DomainError(
      "FORBIDDEN",
      "Your account is not assigned to a canteen.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const original = await tx.stockMovement.findUnique({
      where: { id: stockMovementId },
      select: {
        id: true,
        productId: true,
        locationId: true,
        customerId: true,
        recordedById: true,
        occurredAt: true,
        correctsMovementId: true,
        quantity: true,
      },
    });
    if (!original || original.customerId === null) {
      throw new DomainError("NOT_FOUND", "Canteen credit sale not found.");
    }
    if (original.correctsMovementId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This row is itself a correction. Void the original credit sale instead.",
      );
    }
    if (
      original.recordedById !== ctx.userId ||
      original.locationId !== ctx.locationId
    ) {
      throw new DomainError(
        "FORBIDDEN",
        "You can only undo your own credit sales.",
      );
    }
    assertStaffDateIsToday(original.occurredAt, ctx);
    if (await isDayClosed(original.occurredAt, tx)) {
      throw new DomainError(
        "FORBIDDEN",
        "This day is closed — ask an administrator to correct this credit sale.",
      );
    }

    const debt = await tx.debt.findFirst({
      where: { sourceType: "canteen_credit_sale", sourceId: original.id },
      select: { customerId: true },
    });
    if (!debt) {
      throw new DomainError(
        "NOT_FOUND",
        "The debt for this credit sale was not found.",
      );
    }

    const [quantityDeltas, amountDeltas] = await Promise.all([
      tx.stockMovement.aggregate({
        _sum: { quantity: true },
        where: { correctsMovementId: original.id },
      }),
      tx.debt.aggregate({
        _sum: { amount: true },
        where: { sourceType: "canteen_credit_sale", sourceId: original.id },
      }),
    ]);

    // `original.quantity` is negative (stock left); the magnitude sold is
    // its negation. Each correction's `quantity` is stock RETURNED
    // (positive), so its magnitude reduces the outstanding sold amount —
    // negate the correction sum too before subtracting.
    const currentDerivedQuantity = original.quantity
      .negated()
      .sub(quantityDeltas._sum.quantity ?? ZERO);
    const currentDerivedAmount = amountDeltas._sum.amount ?? ZERO;

    if (currentDerivedQuantity.isZero() && currentDerivedAmount.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This credit sale is already voided.",
      );
    }

    await tx.stockMovement.create({
      data: {
        productId: original.productId,
        locationId: original.locationId,
        movementType: "sale",
        quantity: currentDerivedQuantity, // returns stock (positive)
        customerId: original.customerId,
        recordedById: ctx.userId,
        occurredAt: original.occurredAt,
        correctsMovementId: original.id,
      },
    });

    await voidCanteenDebt(
      {
        customerId: debt.customerId,
        sourceId: original.id,
        currentAmount: currentDerivedAmount,
        occurredAt: original.occurredAt,
      },
      { tx },
    );

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "soft_delete",
        entityType: "canteen_credit_sale",
        entityId: original.id,
        oldValue: {
          quantity: quantityString(currentDerivedQuantity),
          total: moneyString(currentDerivedAmount),
        },
        newValue: { voided: true },
        occurredAt: original.occurredAt,
      },
    });
  });

  return { voided: true };
}
