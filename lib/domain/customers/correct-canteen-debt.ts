import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";

/**
 * Append one **signed** `Debt` row against a canteen credit sale (ADR-91).
 *
 * **Tx-only.** Called by `correctCanteenCreditSale` / `voidCanteenCreditSale`
 * (`lib/domain/sales`) inside the transaction that writes the correcting
 * `StockMovement`. `Debt` has no `corrects<X>Id` self-relation (unlike
 * `Repayment`) — a canteen-sourced debt's current value is instead the
 * plain sum of every `Debt` row sharing its `sourceId`, the same shape
 * `correctDebt` already uses for Order-sourced debts (multiple signed rows
 * per `orderId`, summed). `amount` of exactly zero is rejected — there is
 * nothing to write.
 */
export async function correctCanteenDebt(
  input: {
    customerId: string;
    sourceId: string;
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
      sourceType: "canteen_credit_sale",
      sourceId: input.sourceId,
      amount: input.amount,
      occurredAt: input.occurredAt,
    },
  });
}

/**
 * Fully reverse a canteen credit sale's `Debt` (ADR-91). Writes one signed
 * row carrying the negated current derived amount for `sourceId` — the
 * customer no longer owes it. `currentAmount` is the caller's already-
 * computed `Σ Debt.amount` for this `sourceId` (the caller needs it anyway
 * to decide whether the linked `StockMovement` correction fully reverses).
 */
export async function voidCanteenDebt(
  input: {
    customerId: string;
    sourceId: string;
    currentAmount: Prisma.Decimal;
    occurredAt: Date;
  },
  ctx: { tx: Prisma.TransactionClient },
) {
  return correctCanteenDebt(
    {
      customerId: input.customerId,
      sourceId: input.sourceId,
      amount: input.currentAmount.negated(),
      occurredAt: input.occurredAt,
    },
    ctx,
  );
}
