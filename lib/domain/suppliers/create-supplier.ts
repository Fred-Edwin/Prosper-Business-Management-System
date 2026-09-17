import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import { toSupplierView } from "./internal";
import type { CreateSupplierInput, Supplier, SupplierContext } from "./types";

/**
 * Create a supplier/vendor record. Admin or Cashier may create one inline
 * from the purchase-payment / expense dropdown — enforced at the route
 * (same roles as who may record those payments).
 *
 * `name` is trimmed and must be non-empty; `phone`/`note` are optional and
 * kept lenient (no format constraint), matching Customer's phone field.
 *
 * Writes an `AuditLog` row (ADR-25) — a supplier is not a ledger entity, so
 * its creation isn't otherwise self-evident from a ledger.
 */
export async function createSupplier(
  input: CreateSupplierInput,
  ctx: SupplierContext,
): Promise<Supplier> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Supplier name is required.", "name");
  }
  const phone = input.phone?.trim() || null;
  const note = input.note?.trim() || null;

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({ data: { name, phone, note } });
    await tx.auditLog.create({
      data: {
        userId: ctx.actorId,
        action: "create",
        entityType: "supplier",
        entityId: created.id,
        newValue: { name: created.name, phone: created.phone },
        occurredAt: created.createdAt,
      },
    });
    return created;
  });

  return toSupplierView(row);
}
