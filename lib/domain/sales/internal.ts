import { Prisma } from "@prisma/client";
import type { Order, OrderLine } from "@prisma/client";
import { DomainError } from "./errors";
import type { OrderLineView, OrderView } from "./types";

/**
 * "Decimal string on the wire, `Prisma.Decimal` internally" — the same
 * convention `lib/domain/catalog/internal.ts` and `lib/domain/stock/internal.ts`
 * use. Money is `Decimal(12,2)`; quantities are `Decimal(14,4)`.
 */

export const ZERO = new Prisma.Decimal(0);

/** Parse a submitted quantity to a positive `Prisma.Decimal`, or throw. */
export function toQuantity(value: string, field = "quantity"): Prisma.Decimal {
  let dec: Prisma.Decimal;
  try {
    dec = new Prisma.Decimal(value);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Quantity must be a number.", field);
  }
  if (!dec.isFinite() || dec.isZero() || dec.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Quantity must be greater than zero.",
      field,
    );
  }
  return dec;
}

/** Parse a money input (`Decimal(12,2)`), rejecting negatives / non-finite. */
export function toMoney(value: string, field = "amount"): Prisma.Decimal {
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

/** `quantity × unitPrice`, rounded to 2dp (money precision). */
export function computeLineSubtotal(
  quantity: Prisma.Decimal,
  unitPrice: Prisma.Decimal,
): Prisma.Decimal {
  return quantity.mul(unitPrice).toDecimalPlaces(2);
}

/** Σ line subtotals + (deliveryFee ?? 0), 2dp. */
export function computeTotal(
  subtotals: Prisma.Decimal[],
  deliveryFee: Prisma.Decimal | null,
): Prisma.Decimal {
  const lineSum = subtotals.reduce((acc, s) => acc.add(s), ZERO);
  return lineSum.add(deliveryFee ?? ZERO).toDecimalPlaces(2);
}

/** `Decimal` → 4dp string (`"2.0000"`). */
export function quantityString(value: Prisma.Decimal): string {
  return value.toFixed(4);
}

/** `Decimal` → 2dp string (`"230.00"`). */
export function moneyString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

/** Map an `Order` row (+ its lines) to the wire shape. */
export function toOrderView(row: Order & { lines: OrderLine[] }): OrderView {
  return {
    id: row.id,
    locationId: row.locationId,
    cashierId: row.cashierId,
    orderType: row.orderType,
    deliveryFee: row.deliveryFee == null ? null : moneyString(row.deliveryFee),
    paymentMethod: row.paymentMethod,
    customerId: row.customerId,
    total: moneyString(row.total),
    correctsOrderId: row.correctsOrderId,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lines: row.lines
      .slice()
      .sort((a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) || a.id.localeCompare(b.id))
      .map(toOrderLineView),
  };
}

function toOrderLineView(row: OrderLine): OrderLineView {
  return {
    id: row.id,
    productId: row.productId,
    quantity: quantityString(row.quantity),
    unitPrice: moneyString(row.unitPrice),
    subtotal: moneyString(row.subtotal),
  };
}
