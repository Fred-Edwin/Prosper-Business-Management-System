import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import { toCustomerView } from "./internal";
import type { Customer, CustomerContext, CustomerLocation } from "./types";

/**
 * Set which side of the business a customer buys from (ADR-93). **Admin
 * only.** A label for filtering and per-side totals, not a ledger fact, so
 * this is a direct update (not a correction row), with the change kept in
 * the `AuditLog` as was → now. Setting the current value is a no-op
 * success. Archived customers can be relabelled too.
 */
export async function setCustomerLocation(
  id: string,
  location: CustomerLocation,
  ctx: CustomerContext,
): Promise<Customer> {
  if (ctx.role !== "admin") {
    throw new DomainError("FORBIDDEN", "Only an administrator can change a customer's location.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new DomainError("NOT_FOUND", "Customer not found.");
    }
    if (existing.location === location) return toCustomerView(existing);

    const updated = await tx.customer.update({ where: { id }, data: { location } });
    await tx.auditLog.create({
      data: {
        userId: ctx.actorId,
        action: "correct",
        entityType: "customer",
        entityId: id,
        oldValue: { location: existing.location },
        newValue: { location: updated.location },
        occurredAt: new Date(),
      },
    });
    return toCustomerView(updated);
  });
}
