import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import { toCustomerView } from "./internal";
import type { CreateCustomerInput, Customer, CustomerContext } from "./types";

/**
 * Create a customer record (ADR-19). Admin or Cashier — enforced at the
 * route.
 *
 * `name` and `phone` are trimmed and must be non-empty. Phone is kept
 * lenient on purpose — Kenyan numbers vary in format (07…, +2547…, 01…)
 * and SCHEMA.md places no format or uniqueness constraint on the column,
 * so neither does this.
 *
 * Writes an `AuditLog` row (ADR-25) — a customer is not a ledger entity,
 * so its creation isn't otherwise self-evident from a ledger.
 */
export async function createCustomer(
  input: CreateCustomerInput,
  ctx: CustomerContext,
): Promise<Customer> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Customer name is required.", "name");
  }

  const phone = input.phone.trim();
  if (phone.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Phone number is required.", "phone");
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({ data: { name, phone } });
    await tx.auditLog.create({
      data: {
        userId: ctx.actorId,
        action: "create",
        entityType: "customer",
        entityId: created.id,
        newValue: { name: created.name, phone: created.phone },
        occurredAt: created.createdAt,
      },
    });
    return created;
  });

  return toCustomerView(row);
}
