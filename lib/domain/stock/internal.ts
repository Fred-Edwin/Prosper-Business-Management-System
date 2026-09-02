import { Prisma } from "@prisma/client";
import type { StockMovementView } from "./types";
import { DomainError } from "./errors";

/**
 * "Decimal string on the wire, `Prisma.Decimal` internally" — the same
 * convention `lib/domain/catalog/internal.ts` uses for money, applied to
 * `Decimal(14,4)` stock quantities.
 */

/** Parse a submitted quantity to a `Prisma.Decimal`, or throw `VALIDATION_ERROR`. */
export function toQuantity(value: string, field = "quantity"): Prisma.Decimal {
  let dec: Prisma.Decimal;
  try {
    dec = new Prisma.Decimal(value);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Quantity must be a number.", field);
  }
  if (!dec.isFinite()) {
    throw new DomainError("VALIDATION_ERROR", "Quantity must be a finite number.", field);
  }
  return dec;
}

/**
 * Parse an **unsigned magnitude** input: reject zero and negatives. The
 * domain applies the sign for the movement type.
 */
export function toMagnitude(value: string, field = "quantity"): Prisma.Decimal {
  const dec = toQuantity(value, field);
  if (dec.isZero() || dec.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Quantity must be greater than zero.",
      field,
    );
  }
  return dec;
}

/** Parse a money input (`Decimal(12,2)`), rejecting negatives. */
export function toMoney(value: string, field = "cost"): Prisma.Decimal {
  let dec: Prisma.Decimal;
  try {
    dec = new Prisma.Decimal(value);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Amount must be a number.", field);
  }
  if (!dec.isFinite() || dec.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be a non-negative number.",
      field,
    );
  }
  return dec;
}

/** `Decimal` → 4dp decimal string (`"12.5000"`). */
export function quantityString(value: Prisma.Decimal): string {
  return value.toFixed(4);
}

type StockMovementRow = Prisma.StockMovementGetPayload<Record<string, never>>;

/** The same row with its `product` relation joined — what `listMovements` selects. */
type StockMovementRowWithProduct = StockMovementRow & {
  product?: { name: string; unitLabel: string } | null;
};

/**
 * Map a Prisma `StockMovement` row to the wire shape. When the caller
 * included the `product` relation, its name/unit travel on the view so an
 * archived product still renders with a name (F9) — see
 * `StockMovementView.productName`.
 */
export function toMovementView(row: StockMovementRowWithProduct): StockMovementView {
  return {
    id: row.id,
    productId: row.productId,
    locationId: row.locationId,
    movementType: row.movementType,
    quantity: quantityString(row.quantity),
    recordedById: row.recordedById,
    occurredAt: row.occurredAt.toISOString(),
    reason: row.reason,
    reasonNote: row.reasonNote,
    orderId: row.orderId,
    stockCountId: row.stockCountId,
    transferCounterpartLocationId: row.transferCounterpartLocationId,
    purchasePaymentId: row.purchasePaymentId,
    purchaseSupplier: row.purchaseSupplier,
    purchaseOrderedQty:
      row.purchaseOrderedQty == null ? null : row.purchaseOrderedQty.toFixed(4),
    purchaseTotalCost:
      row.purchaseTotalCost == null ? null : row.purchaseTotalCost.toFixed(2),
    purchasePaidFrom:
      row.purchasePaidFrom === "cash" || row.purchasePaidFrom === "mpesa_bank"
        ? row.purchasePaidFrom
        : null,
    correctsMovementId: row.correctsMovementId,
    note: row.note,
    // Only `listMovements` joins the `canteen_sale` MoneyMovement; the
    // single-write path has no revenue to report.
    derivedRevenue: null,
    productName: row.product?.name ?? null,
    unitLabel: row.product?.unitLabel ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
