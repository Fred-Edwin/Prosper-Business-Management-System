import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  ActorContext,
  CorrectStockBalanceInput,
  StockMovementView,
} from "./types";
import { toQuantity, toMovementView } from "./internal";
import { DomainError } from "./errors";
import {
  assertKindAllowedAtLocation,
  assertLocationExists,
  assertProductExists,
} from "./guards";
import { derivedBalanceOnTx } from "./movement-core";

/**
 * Correct a product/location's whole DERIVED stock balance to a stated final
 * value (ADR-72 shape — see `correctPurchasePayment` for the sibling
 * pattern). **Admin only.** **Not** day-close gated — an Admin correction
 * row is always allowed, any day (ADR-72 §1: `assertActorMayCorrectOnDate`
 * is only for paths where staff may also correct; this one never lets staff
 * correct).
 *
 * Unlike `correctMovement` (which restates one specific existing row) or
 * `setOpeningStock` (which restates the Day 1 opening figure only), this
 * targets the running SUM of every row for the pair — there is no single
 * "original" row to point at. In one transaction:
 *
 *   1. guard the product/location pair exists and is a legal kind/location
 *      combination (R1, ADR-67);
 *   2. compute the current derived balance (`derivedBalanceOnTx`);
 *   3. `delta = correctedBalance - currentBalance`; a zero delta is
 *      `VALIDATION_ERROR` (idempotent — matches every other correction path);
 *   4. write ONE new `variance` `StockMovement` row, `quantity: delta`,
 *      `correctsMovementId: null` (no single row corrected — see above;
 *      `listMovements`'s derived-balance fold sums every row for the pair
 *      regardless of `correctsMovementId`, so this row folds in naturally);
 *   5. `AuditLog action: "correct"` with `oldValue`/`newValue` sharing the
 *      `balance` key, so `/admin/audit-trail` renders a real was→now row.
 *
 * `variance` is reused here (previously written only for a short transfer
 * receipt — see the schema's `MovementType` doc comment) rather than adding
 * a new enum value or a migration; the `note` disambiguates the two uses.
 *
 * No paired `voidStockBalance` — per ADR-72, a void is only needed where a
 * distinct one-click undo makes sense. Calling this again with a different
 * target (including the pre-correction value) is itself the full undo,
 * exactly as `setOpeningStock` has never needed one.
 */
export async function correctStockBalance(
  input: CorrectStockBalanceInput,
  actor: ActorContext,
): Promise<StockMovementView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct a stock balance.",
    );
  }

  const corrected = toQuantity(input.correctedBalance, "correctedBalance");

  const row = await prisma.$transaction(async (tx) => {
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);
    await assertKindAllowedAtLocation(tx, input.productId, input.locationId);

    const currentBalance = await derivedBalanceOnTx(
      tx,
      input.productId,
      input.locationId,
    );

    const delta = corrected.sub(currentBalance);
    if (delta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected balance is the same as the current one.",
        "correctedBalance",
      );
    }

    const correction = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "variance",
        quantity: delta,
        recordedById: input.recordedById,
        occurredAt: new Date(),
        correctsMovementId: null,
        note: input.note?.trim() || "Balance correction",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.recordedById,
        action: "correct",
        entityType: "stock_movement",
        entityId: correction.id,
        oldValue: { balance: currentBalance.toFixed(4) },
        newValue: {
          balance: corrected.toFixed(4),
          correctionId: correction.id,
        },
        occurredAt: correction.occurredAt,
      },
    });

    return correction;
  });

  return toMovementView(row);
}
