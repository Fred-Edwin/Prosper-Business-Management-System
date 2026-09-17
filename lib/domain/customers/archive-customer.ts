import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

/**
 * Archive (soft-delete) a customer: set `Customer.deletedAt = now()`.
 * Idempotent — archiving an already-archived customer is a no-op success.
 * `NOT_FOUND` only if the customer never existed.
 *
 * No hard-delete counterpart exists for Customer (unlike Product/Asset):
 * a customer with any `Order`/`Debt`/`Repayment` history — which is true
 * of almost every real customer — can never be safely hard-deleted, so
 * this is the only removal path.
 */
export async function archiveCustomer(id: string): Promise<void> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Customer not found.");
  }
  if (existing.deletedAt) {
    return;
  }

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Unarchive a customer — mirror of `archiveCustomer`. Clears
 * `Customer.deletedAt`. Idempotent: unarchiving an active customer is a
 * no-op success. `NOT_FOUND` only if the customer never existed.
 */
export async function unarchiveCustomer(id: string): Promise<void> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Customer not found.");
  }
  if (existing.deletedAt == null) {
    return;
  }

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: null },
  });
}
