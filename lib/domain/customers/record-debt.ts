import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";
import type { RecordDebtInput } from "./types";

/**
 * Append one `Debt` row for a credit order or a canteen credit sale
 * (ADR-19, ADR-91).
 *
 * **Tx-only.** A `Debt` is only ever created by `createOrder` (S4, Order-
 * sourced) when `paymentMethod === "credit"`, or by `recordCanteenCreditSale`
 * (ADR-91, canteen-sourced) — inside the same transaction that writes the
 * originating `Order`/`StockMovement` — debt and its source commit together
 * or not at all. This module owns the `Debt` *shape* and the reads over it;
 * callers use this helper rather than reaching into Prisma for `debt.create`
 * directly.
 *
 * No money movement here — a credit sale writes a `Debt`, not a
 * `MoneyMovement` (plan §3.2). No `AuditLog` here either: the debt is a
 * ledger row and the caller writes its own audit entry; a debt is
 * self-evident from the order/movement it links to.
 *
 * There is no correction path for an Order-sourced debt — a corrected
 * credit order is a new `Order` with its own offsetting `Debt` (ADR-15),
 * handled by S4's `correctOrder`. A canteen-sourced debt's correction path
 * is `correctCanteenDebt`/`voidCanteenDebt` (ADR-91).
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
      amount: input.amount,
      occurredAt: input.occurredAt,
      ...("orderId" in input
        ? { orderId: input.orderId }
        : { sourceType: input.sourceType, sourceId: input.sourceId }),
    },
  });
}
