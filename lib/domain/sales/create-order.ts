import { prisma } from "@/lib/db";
import { assertDayOpen, assertStaffDateIsToday } from "@/lib/domain/audit";
import { toOrderView } from "./internal";
import { validateOrder, writeOrderEffects } from "./order-effects";
import { resolveRestaurantId } from "./restaurant-location";
import type { ActorContext, CreateOrderInput, OrderView } from "./types";

/**
 * Create a Restaurant order (M2-F1, ADR-16). `ctx.role` is `cashier` —
 * enforced at the route.
 *
 * One `prisma.$transaction`:
 *   1. resolve the Restaurant location,
 *   2. validate lines / prices / delivery-fee / payment (S4 handoff §3),
 *      snapshot each line's `sellingPrice` as its `unitPrice`,
 *   3. §3.8 BLOCK — re-read the derived Restaurant balance ON `tx`, right
 *      before the writes; reject (writing nothing) if any product's total
 *      ordered quantity exceeds it — the balance is never allowed negative,
 *   4. write the `Order` + one `OrderLine` per line + one negative `sale`
 *      `StockMovement` per line + **either** a `MoneyMovement` (cash /
 *      M-Pesa, matching account, `sourceType: "order"`) **or** a `Debt`
 *      (credit; no money movement — plan §3.2) + one `AuditLog` row.
 *
 * Returns the `OrderView` (order + lines; no stock / money detail).
 */
export async function createOrder(
  input: CreateOrderInput,
  ctx: ActorContext,
): Promise<OrderView> {
  const row = await prisma.$transaction(async (tx) => {
    const restaurantId = ctx.restaurantId ?? (await resolveRestaurantId(tx));

    const resolved = await validateOrder({ input, restaurantId, tx });

    // Staff "today only" gate (ADR-53) — a Cashier may only create an
    // order dated today; Admin is exempt. In addition to the day-close
    // gate below, not instead of it.
    assertStaffDateIsToday(resolved.occurredAt, ctx);
    // Day-close gate (ADR-52) — a new order on a sealed date is off-limits;
    // an Admin correction (`correctOrder`) is the only way to touch a
    // closed day.
    await assertDayOpen(resolved.occurredAt, tx);

    const order = await tx.order.create({
      data: {
        locationId: restaurantId,
        cashierId: ctx.userId,
        orderType: resolved.orderType,
        deliveryFee: resolved.deliveryFee,
        paymentMethod: resolved.paymentMethod,
        customerId: resolved.customerId,
        total: resolved.total,
        occurredAt: resolved.occurredAt,
      },
    });

    await writeOrderEffects(tx, order, resolved, ctx.userId);

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "create",
        entityType: "order",
        entityId: order.id,
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
