import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";
import type { RecordDebtInput } from "./types";

/**
 * Append one `Debt` row for a credit order (ADR-19).
 *
 * **Tx-only.** A `Debt` is only ever created by `createOrder` (S4) when
 * `paymentMethod === "credit"`, inside the same transaction that writes
 * the `Order`, its `OrderLine`s and `StockMovement`s — debt and order
 * commit together or not at all. This module owns the `Debt` *shape* and
 * the reads over it; S4 calls this helper rather than reaching into
 * Prisma for `debt.create` directly.
 *
 * No money movement here — a credit order writes a `Debt`, not a
 * `MoneyMovement` (plan §3.2). No `AuditLog` here either: the debt is a
 * ledger row and `createOrder` writes the order's audit entry; a debt is
 * self-evident from the order it links to.
 *
 * There is no correction path — a corrected credit order is a new `Order`
 * with its own offsetting `Debt` (ADR-15), handled by S4's `correctOrder`.
 */
export async function recordDebt(
  input: RecordDebtInput,
  ctx: { tx: Prisma.TransactionClient },
) {
  if (input.amount.isNegative() || input.amount.isZero()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Debt amount must be greater than zero.",
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
