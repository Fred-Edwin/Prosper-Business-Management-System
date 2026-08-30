import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "@/lib/domain/financials";
import { correctDebt } from "@/lib/domain/customers";
import { DomainError } from "./errors";
import { ZERO, toOrderView } from "./internal";
import { validateOrder } from "./order-effects";
import type { ActorContext, CorrectOrderInput, OrderView } from "./types";

/**
 * Admin-only append-only correction of a posted order (ADR-15 / CONVENTIONS
 * §4 — mirrors `stock/correct-movement.ts`).
 *
 *   - `NOT_FOUND` if the original order is missing.
 *   - `VALIDATION_ERROR` if the target is itself a correction
 *     (`correctsOrderId` set) — corrections don't chain.
 *   - `FORBIDDEN` unless `ctx.role === "admin"`. There is no open-day
 *     cashier branch here — a cashier's open-day edit is `editOwnOrder`.
 *   - `input` is the **corrected final state** of the order (same shape as
 *     `createOrder`).
 *
 * In one transaction it writes a **new `Order`** (`correctsOrderId =
 * original.id`, `cashierId = original.cashierId`, `occurredAt =
 * original.occurredAt` so the correction lands in the original's business
 * day) plus its `OrderLine`s, then **offsetting** ledger rows so the *net*
 * effect across `original + all corrections` equals the corrected state:
 *
 *   - stock: one delta `sale` `StockMovement` per product whose corrected
 *     quantity differs from the current net (`correctsMovementId` points at
 *     the original's `sale` row for that product where there is exactly
 *     one). Net = corrected quantities.
 *   - money: one signed delta `MoneyMovement` (`sourceType: "order"`,
 *     `sourceId` = the new order id) bringing the order's net money to the
 *     corrected cash/M-Pesa total (0 if the corrected order is credit).
 *   - debt: one signed `Debt` (via `correctDebt`) bringing the order's net
 *     debt to the corrected credit total (0 if the corrected order is
 *     cash/M-Pesa). A payment-method change reverses one kind and writes
 *     the other.
 *
 * **Idempotency (Session 17 F-1):** deltas are measured against the
 * *current* derived effect (original + every prior correction). Re-submitting
 * an identical correction computes every delta as zero → `VALIDATION_ERROR`
 * ("nothing to correct").
 */
export async function correctOrder(
  orderId: string,
  input: CorrectOrderInput,
  ctx: ActorContext,
): Promise<OrderView> {
  if (ctx.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct an order.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!original) {
      throw new DomainError("NOT_FOUND", "Order not found.", "orderId");
    }
    if (original.correctsOrderId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This order is itself a correction — correct the original.",
        "orderId",
      );
    }

    // Every order row in this correction chain: the original + all prior
    // corrections (which all point at the original — corrections don't
    // chain). The current derived effect sums the ledger rows across all.
    const priorCorrections = await tx.order.findMany({
      where: { correctsOrderId: original.id },
      select: { id: true },
    });
    const chainOrderIds = [original.id, ...priorCorrections.map((o) => o.id)];

    // Current net `sale` quantity per product across the chain (negative =
    // stock removed). Adding its magnitude back gives the §3.8 comparison
    // "stock as if this order had never happened".
    const netSaleRows = await tx.stockMovement.groupBy({
      by: ["productId"],
      where: { orderId: { in: chainOrderIds }, movementType: "sale" },
      _sum: { quantity: true },
    });
    const netSaleByProduct = new Map<string, Prisma.Decimal>(
      netSaleRows.map((r) => [r.productId, r._sum.quantity ?? ZERO]),
    );
    // §3.8 add-back: the quantity currently removed (positive magnitude).
    const replacingQtyByProduct = new Map<string, Prisma.Decimal>();
    for (const [productId, net] of netSaleByProduct) {
      replacingQtyByProduct.set(productId, net.negated());
    }

    const resolved = await validateOrder({
      input,
      restaurantId: original.locationId,
      replacingQtyByProduct,
      tx,
    });

    // Corrected target `sale` quantity per product (negative = leaves stock).
    const correctedSaleByProduct = new Map<string, Prisma.Decimal>();
    for (const line of resolved.lines) {
      correctedSaleByProduct.set(
        line.productId,
        (correctedSaleByProduct.get(line.productId) ?? ZERO).add(
          line.quantity.negated(),
        ),
      );
    }

    // Current net money / debt for the order across the chain.
    const [moneyAgg, debtAgg] = await Promise.all([
      tx.moneyMovement.aggregate({
        _sum: { amount: true },
        where: { sourceType: "order", sourceId: { in: chainOrderIds } },
      }),
      tx.debt.aggregate({
        _sum: { amount: true },
        where: { orderId: { in: chainOrderIds } },
      }),
    ]);
    const currentMoneyNet = moneyAgg._sum.amount ?? ZERO;
    const currentDebtNet = debtAgg._sum.amount ?? ZERO;

    const desiredMoneyNet =
      resolved.paymentMethod === "credit" ? ZERO : resolved.total;
    const desiredDebtNet =
      resolved.paymentMethod === "credit" ? resolved.total : ZERO;

    const moneyDelta = desiredMoneyNet.sub(currentMoneyNet);
    const debtDelta = desiredDebtNet.sub(currentDebtNet);

    // Stock deltas per (union of) product.
    const productIds = new Set<string>([
      ...netSaleByProduct.keys(),
      ...correctedSaleByProduct.keys(),
    ]);
    const stockDeltas: { productId: string; delta: Prisma.Decimal }[] = [];
    for (const productId of productIds) {
      const current = netSaleByProduct.get(productId) ?? ZERO;
      const desired = correctedSaleByProduct.get(productId) ?? ZERO;
      const delta = desired.sub(current);
      if (!delta.isZero()) stockDeltas.push({ productId, delta });
    }

    // F-1: nothing changed from the current derived state.
    if (stockDeltas.length === 0 && moneyDelta.isZero() && debtDelta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This correction matches the order's current state — nothing to correct.",
        "lines",
      );
    }

    const preSummary = {
      total: original.total.toFixed(2),
      paymentMethod: original.paymentMethod,
      orderType: original.orderType,
      lineCount: original.lines.length,
    };

    // The new correcting order row. `total` = the recomputed corrected total.
    const correction = await tx.order.create({
      data: {
        locationId: original.locationId,
        cashierId: original.cashierId, // Admin corrects on the cashier's behalf
        orderType: resolved.orderType,
        deliveryFee: resolved.deliveryFee,
        paymentMethod: resolved.paymentMethod,
        customerId: resolved.customerId,
        total: resolved.total,
        correctsOrderId: original.id,
        occurredAt: original.occurredAt, // land in the original's business day
      },
    });

    // Corrected line set on the new order (the read folds the chain; this
    // row carries the corrected final lines for display).
    for (const line of resolved.lines) {
      await tx.orderLine.create({
        data: {
          orderId: correction.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          subtotal: line.subtotal,
        },
      });
    }

    // One delta `sale` StockMovement per changed product. Point
    // `correctsMovementId` at the original's `sale` row for that product
    // where there is exactly one (matches `stock/correct-movement.ts`).
    const originalSaleRows = await tx.stockMovement.findMany({
      where: { orderId: original.id, movementType: "sale" },
      select: { id: true, productId: true },
    });
    const originalSaleByProduct = new Map<string, string[]>();
    for (const r of originalSaleRows) {
      const arr = originalSaleByProduct.get(r.productId) ?? [];
      arr.push(r.id);
      originalSaleByProduct.set(r.productId, arr);
    }
    for (const { productId, delta } of stockDeltas) {
      const originals = originalSaleByProduct.get(productId) ?? [];
      await tx.stockMovement.create({
        data: {
          productId,
          locationId: original.locationId,
          movementType: "sale",
          quantity: delta,
          recordedById: ctx.userId,
          occurredAt: original.occurredAt,
          orderId: correction.id,
          correctsMovementId: originals.length === 1 ? originals[0] : null,
        },
      });
    }

    if (!moneyDelta.isZero()) {
      await recordMoneyMovement(
        {
          account:
            resolved.account ??
            // reversing a former cash/M-Pesa order that is now credit:
            // use whatever account the original money movement used.
            (
              await tx.moneyMovement.findFirst({
                where: { sourceType: "order", sourceId: { in: chainOrderIds } },
                orderBy: { createdAt: "asc" },
                select: { account: true },
              })
            )?.account ??
            "cash",
          amount: moneyDelta, // signed
          sourceType: "order",
          sourceId: correction.id,
          occurredAt: original.occurredAt,
        },
        { actorId: ctx.userId, tx },
      );
    }

    if (!debtDelta.isZero()) {
      // Whose debt? The corrected customer if credit; otherwise the
      // customer the original debt was against (we are reversing it).
      const customerId =
        resolved.customerId ??
        (
          await tx.debt.findFirst({
            where: { orderId: { in: chainOrderIds } },
            orderBy: { createdAt: "asc" },
            select: { customerId: true },
          })
        )?.customerId;
      if (!customerId) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Cannot resolve which customer this debt correction applies to.",
          "customerId",
        );
      }
      await correctDebt(
        {
          customerId,
          orderId: correction.id,
          amount: debtDelta, // signed
          occurredAt: original.occurredAt,
        },
        { tx },
      );
    }

    await tx.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "correct",
        entityType: "order",
        entityId: correction.id,
        oldValue: preSummary,
        newValue: {
          total: resolved.total.toFixed(2),
          paymentMethod: resolved.paymentMethod,
          orderType: resolved.orderType,
          lineCount: resolved.lines.length,
          correctsOrderId: original.id,
        },
        occurredAt: original.occurredAt,
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: correction.id },
      include: { lines: true },
    });
  });

  return toOrderView(row);
}
