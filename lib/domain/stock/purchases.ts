import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "@/lib/domain/financials";
import type {
  RecordPurchasePaymentInput,
  RecordPurchaseReceiptInput,
  StockMovementView,
} from "./types";
import { toMagnitude, toMoney, toMovementView } from "./internal";
import { DomainError } from "./errors";
import { assertLocationExists, assertProductExists } from "./guards";

const PAID_FROM_DISPLAY: Record<"cash" | "mpesa_bank", string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

/** "18,000.00" — grouped thousands, 2dp. */
function fmtMoney(dec: Prisma.Decimal): string {
  return dec.toNumber().toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "20" or "20.5" — trailing zeros trimmed for the human note only. */
function trimQty(dec: Prisma.Decimal): string {
  return dec.toFixed(4).replace(/\.?0+$/, "");
}

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
 * quantity. We store `quantity = 0` on the row. Since ADR-46 §3 the
 * ordered magnitude, supplier, total cost and paid-from account are real
 * columns (`purchaseOrderedQty` / `purchaseSupplier` / `purchaseTotalCost`
 * / `purchasePaidFrom`); a human `note` sentence is still composed for
 * display and audit. This keeps the ledger sum honest without a
 * movement-type filter in the hot read path.
 *
 * MONEY EFFECT (resolved M2 S4): the payment also debits the paid-from
 * money account by `cost` — one **negative** `MoneyMovement` (money out),
 * `sourceType: "purchase_payment"`, `sourceId` = this stock-movement id,
 * written inside the same transaction via `recordMoneyMovement` (which
 * also writes its own `AuditLog` row). The money ledger seam did not exist
 * in M1 (`recordMoneyMovement` is M2 S3); the `paidFromAccount` was
 * already captured on the row for exactly this.
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

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { unitLabel: true },
    });
    const unit = product?.unitLabel ?? "unit";
    const paidFromLabel = PAID_FROM_DISPLAY[input.paidFromAccount];

    const occurredAt = new Date();
    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.locationId,
        movementType: "purchase_payment",
        quantity: orderedQty.mul(0), // no stock effect (ADR-39)
        recordedById: input.recordedById,
        occurredAt,
        // Real detail columns (ADR-46 §3).
        purchaseSupplier: supplier,
        purchaseOrderedQty: orderedQty,
        purchaseTotalCost: cost,
        purchasePaidFrom: input.paidFromAccount,
        // Human sentence for display / audit — no longer the source of truth.
        note: `Ordered ${trimQty(orderedQty)} ${unit} from ${supplier}; KES ${fmtMoney(cost)} from ${paidFromLabel}`,
      },
    });

    // Money out of the paid-from account (negative amount).
    await recordMoneyMovement(
      {
        account: input.paidFromAccount,
        amount: cost.negated(),
        sourceType: "purchase_payment",
        sourceId: movement.id,
        occurredAt,
      },
      { actorId: input.recordedById, tx },
    );

    return movement;
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
