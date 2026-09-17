import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

/**
 * Archive (soft-delete) a supplier: set `Supplier.deletedAt = now()`.
 * Idempotent — archiving an already-archived supplier is a no-op success.
 * `NOT_FOUND` only if the supplier never existed.
 *
 * No hard-delete counterpart — a supplier referenced by historical
 * StockMovement/Expense display strings (denormalized, not FK'd — see the
 * schema comment) can still be safely archived even though those rows keep
 * showing its name; hiding it from future dropdowns is all archive needs to
 * do.
 */
export async function archiveSupplier(id: string): Promise<void> {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Supplier not found.");
  }
  if (existing.deletedAt) {
    return;
  }

  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Unarchive a supplier — mirror of `archiveSupplier`. Clears
 * `Supplier.deletedAt`. Idempotent: unarchiving an active supplier is a
 * no-op success. `NOT_FOUND` only if the supplier never existed.
 */
export async function unarchiveSupplier(id: string): Promise<void> {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Supplier not found.");
  }
  if (existing.deletedAt == null) {
    return;
  }

  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: null },
  });
}
