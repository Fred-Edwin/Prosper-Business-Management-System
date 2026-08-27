import { prisma } from "@/lib/db";
import type {
  RecordPurchasePaymentInput,
  RecordPurchaseReceiptInput,
  StockMovementView,
} from "./types";
import { toMagnitude, toMoney, toMovementView } from "./internal";
import { DomainError } from "./errors";
import { assertLocationExists, assertProductExists } from "./guards";

/**
 * Record a supplier purchase payment (Admin only — enforced at the route).
 *
 * Writes a `purchase_payment` `StockMovement` row with **no stock effect**
 * (ADR-39: its `quantity` is the ordered magnitude, carried as a positive
 * number for reference, but the derived-balance sum ignores movement type
 * — see the note below). It is a ledger marker that later `purchase_receipt`
 * rows match against.
 *
 * NOTE ON THE SUM: `getDerivedStockBalance` sums *every* row's `quantity`.
 * A `purchase_payment` row must therefore not carry a stock-moving
 * quantity. We store `quantity = 0` on the row and keep the ordered
 * magnitude in `note` ("Ordered <qty> from <supplier>"). This keeps the
 * ledger sum honest without a movement-type filter in the hot read path.
 *
 * TODO(mock): F3 Financials owns `MoneyMovement` write logic. This payment
 * must also debit Cash at hand / M-Pesa-Bank by `cost`. Deferred to F3 per
 * the Session 6 handoff (Required-reading §6) and ADR-39 — `paidFromAccount`
 * is captured here so F3 can write the paired `MoneyMovement` without a
 * schema change.
 */
export async function recordPurchasePayment(
  input: RecordPurchasePaymentInput,
): Promise<StockMovementView> {
  const orderedQty = toMagnitude(input.quantity);
  const cost = toMoney(input.cost, "cost");
  const supplier = input.supplier.trim();
  if (supplier.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Supplier is required.", "supplier");
  }

  const row = await prisma.$transaction(async (tx) => {
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "purchase_payment",
        quantity: orderedQty.mul(0), // no stock effect (ADR-39)
        recordedById: input.recordedById,
        occurredAt: new Date(),
        note: `Ordered ${orderedQty.toFixed(4)} from ${supplier}; cost ${cost.toFixed(2)} from ${input.paidFromAccount}`,
      },
    });
  });

  return toMovementView(row);
}

/**
 * Record confirmed receipt of purchased stock at a location (Store
 * Manager / Canteen Attendant — enforced + location-scoped at the route).
 *
 * Writes a `+quantity` `purchase_receipt` row at `locationId`. This is
 * what actually moves stock, independent of whether a matching payment
 * exists (PRD §4.2). An optional `purchasePaymentId` links it back to a
 * payment; if given it must point at a real `purchase_payment` row.
 */
export async function recordPurchaseReceipt(
  input: RecordPurchaseReceiptInput,
): Promise<StockMovementView> {
  const qty = toMagnitude(input.quantity);

  const row = await prisma.$transaction(async (tx) => {
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.locationId);

    if (input.purchasePaymentId != null && input.purchasePaymentId !== "") {
      const payment = await tx.stockMovement.findUnique({
        where: { id: input.purchasePaymentId },
        select: { id: true, movementType: true },
      });
      if (!payment || payment.movementType !== "purchase_payment") {
        throw new DomainError(
          "NOT_FOUND",
          "The linked purchase payment does not exist.",
          "purchasePaymentId",
        );
      }
    }

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "purchase_receipt",
        quantity: qty,
        recordedById: input.recordedById,
        occurredAt: new Date(),
        purchasePaymentId:
          input.purchasePaymentId != null && input.purchasePaymentId !== ""
            ? input.purchasePaymentId
            : null,
      },
    });
  });

  return toMovementView(row);
}
