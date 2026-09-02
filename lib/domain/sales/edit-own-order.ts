import { prisma } from "@/lib/db";
import { isDayClosed } from "@/lib/domain/audit";
import { DomainError } from "./errors";
import { toOrderView } from "./internal";
import { validateOrder, writeOrderEffects } from "./order-effects";
import type { ActorContext, EditOwnOrderInput, OrderView } from "./types";

/**
 * A Cashier's **true edit** of their own, same-day order (PRD §4.3 — "edit
 * my own orders until the day is closed"). Not a correction row — while the
 * day is open the ledger history is simply rewritten; history-preservation
 * (via `correctOrder`) kicks in only after the day rolls.
 *
 *   - `NOT_FOUND` if the order is missing.
 *   - `FORBIDDEN` if `order.cashierId !== ctx.userId`.
 *   - `FORBIDDEN` ("closed") if the order's Africa/Nairobi business day is
 *     not today. M2 has no `DayClose` UI, so this is a business-date
 *     equality check, not a `DayClose` lookup — M3 swaps in the real gate.
 *   - Re-runs ALL of `createOrder`'s validation on the new input, including
 *     §3.8 — but the stock check adds back this order's own existing `sale`
 *     movements first (we replace them, not stack). Simplest correct form:
 *     delete this order's `OrderLine`s + `sale` `StockMovement`s + its
 *     `MoneyMovement` / `Debt`, re-derive, re-write everything.
 *   - `AuditLog` `action: "correct"` (no `edit` in the enum), `oldValue` =
 *     the pre-edit summary, `newValue` = the post-edit summary.
 */
export async function editOwnOrder(
  orderId: string,
  input: EditOwnOrderInput,
  ctx: ActorContext,
): Promise<OrderView> {
  const row = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) {
      throw new DomainError("NOT_FOUND", "Order not found.", "orderId");
    }
    if (order.cashierId !== ctx.userId) {
      throw new DomainError("FORBIDDEN", "You can only edit your own orders.");
    }
    // A true edit is a staff same-day action — once the order's business
    // date is sealed (ADR-52) the only way back in is an Admin correction
    // row via `correctOrder`.
    if (await isDayClosed(order.occurredAt, tx)) {
      throw new DomainError(
        "FORBIDDEN",
        "This day is closed — ask an administrator to correct it.",
      );
    }
    if (order.correctsOrderId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This order is itself a correction. Correct the original instead.",
        "orderId",
      );
    }

    const preEditSummary = {
      total: order.total.toFixed(2),
      paymentMethod: order.paymentMethod,
      orderType: order.orderType,
      lineCount: order.lines.length,
    };

    // Clear the old effects. A true edit leaves no ledger history behind.
    // We delete this order's `sale` movements BEFORE re-deriving the
    // balance in `validateOrder`, so the §3.8 check already sees "stock as
    // if this order had not happened" — no `replacingQtyByProduct`
    // add-back is needed (that seam is for `correctOrder`, which is
    // append-only and never deletes).
    // `recordMoneyMovement` wrote an `AuditLog` row per money movement
    // (`entityType: "money_movement"`); clear those first (they FK nothing
    // but keep the audit trail honest — the movement they describe is
    // gone), then the movements, debts, sale StockMovements and lines.
    const oldMoneyMovements = await tx.moneyMovement.findMany({
      where: { sourceType: "order", sourceId: order.id },
      select: { id: true },
    });
    await tx.auditLog.deleteMany({
      where: {
        entityType: "money_movement",
        entityId: { in: oldMoneyMovements.map((m) => m.id) },
      },
    });
    await tx.moneyMovement.deleteMany({
      where: { sourceType: "order", sourceId: order.id },
    });
    await tx.debt.deleteMany({ where: { orderId: order.id } });
    await tx.stockMovement.deleteMany({
      where: { orderId: order.id, movementType: "sale" },
    });
    await tx.orderLine.deleteMany({ where: { orderId: order.id } });

    const resolved = await validateOrder({
      input,
      restaurantId: order.locationId,
      tx,
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        orderType: resolved.orderType,
        deliveryFee: resolved.deliveryFee,
        paymentMethod: resolved.paymentMethod,
        customerId: resolved.customerId,
        total: resolved.total,
        occurredAt: resolved.occurredAt,
      },
    });

    await writeOrderEffects(
      tx,
      { id: order.id, locationId: order.locationId },
      resolved,
      ctx.userId,
    );

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "correct",
        entityType: "order",
        entityId: order.id,
        oldValue: preEditSummary,
        newValue: {
          total: resolved.total.toFixed(2),
          paymentMethod: resolved.paymentMethod,
          orderType: resolved.orderType,
          lineCount: resolved.lines.length,
        },
        occurredAt: resolved.occurredAt,
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        cashier: { select: { name: true } },
        lines: { include: { product: { select: { name: true } } } },
      },
    });
  });

  return toOrderView(row);
}
