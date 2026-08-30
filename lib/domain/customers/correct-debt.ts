import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";

/**
 * Append one **signed** `Debt` row for an order correction (ADR-15).
 *
 * **Tx-only.** Written by `correctOrder` (S4) inside the transaction that
 * writes the correcting `Order`. Unlike `recordDebt` (which rejects a
 * non-positive amount because a credit *order* always adds a positive
 * debt), a *correction* needs to move the customer's derived balance in
 * either direction — a reversing row is negative, a top-up row is
 * positive. The derived balance (`Σ Debt.amount − Σ Repayment.amount`)
 * stays correct because it is a plain signed sum.
 *
 * `amount` of exactly zero is rejected — there is nothing to write.
 * No `AuditLog` here: the correcting order's own audit entry covers it,
 * and the debt row links to that order.
 */
export async function correctDebt(
  input: {
    customerId: string;
    orderId: string;
    /** Signed `Prisma.Decimal` — negative reverses, positive tops up. */
    amount: Prisma.Decimal;
    occurredAt: Date;
  },
  ctx: { tx: Prisma.TransactionClient },
) {
  if (input.amount.isZero()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Debt correction amount must be non-zero.",
      "amount",
    );
  }
  return ctx.tx.debt.create({
    data: {
      customerId: input.customerId,
      orderId: input.orderId,
      amount: input.amount,
      occurredAt: input.occurredAt,
    },
  });
}
