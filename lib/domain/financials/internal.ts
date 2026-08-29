import { Prisma } from "@prisma/client";
import { DomainError } from "./errors";

/**
 * "Decimal internally, decimal string on the wire" — the money convention
 * shared with `lib/domain/catalog/internal.ts`, here for the `Decimal(12,2)`
 * `MoneyMovement.amount` column.
 */

/** Parse a submitted money magnitude, rejecting non-numbers and non-finite. */
export function toAmount(value: string, field = "amount"): Prisma.Decimal {
  let dec: Prisma.Decimal;
  try {
    dec = new Prisma.Decimal(value);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Amount must be a number.", field);
  }
  if (!dec.isFinite()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be a finite number.",
      field,
    );
  }
  return dec;
}

/**
 * Parse a strictly-positive money amount (a repayment, an order total).
 * Zero and negatives are rejected — the domain decides the sign.
 */
export function toPositiveAmount(value: string, field = "amount"): Prisma.Decimal {
  const dec = toAmount(value, field);
  if (dec.isZero() || dec.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be greater than zero.",
      field,
    );
  }
  return dec;
}

/** `Decimal` → 2dp decimal string (`"1500.00"`). */
export function moneyString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
