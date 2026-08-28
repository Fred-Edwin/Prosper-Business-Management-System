import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

/**
 * Soft-delete an asset: stamp `Asset.deletedAt = now()`. Hidden from
 * `listAssets` by default (ADR-22 / ADR-23). Idempotent — soft-deleting an
 * already-deleted asset is a no-op success. `NOT_FOUND` only if the asset
 * never existed.
 *
 * This is the safe path — an asset that turns out to have history just
 * stays soft-deleted instead of being erased.
 */
export async function softDeleteAsset(id: string): Promise<void> {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Asset not found.");
  }
  if (existing.deletedAt) {
    return;
  }

  await prisma.asset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Permanently delete an asset.
 *
 * - `confirmName` must equal `asset.name` **exactly** (case-sensitive) —
 *   else `VALIDATION_ERROR` on `confirmName`. (The UI-level retype friction
 *   is ADR-23; this is the server-side check that the retyped string matched.)
 * - Referential guard (ADR-23): if the asset has any **linked history**, throw
 *   `CONFLICT` — the frontend turns this into the dialog's blocked
 *   ("can't be deleted") state, not a raw toast. In M1 the only history an
 *   asset can accrue is `AuditLog` rows (`entityType = "asset"`) — there is
 *   no maintenance-log / assignment table yet (ADR-22 keeps the surface
 *   small). When one lands, add its `count` to the guard here — the same
 *   shape as `hardDeleteProduct`.
 * - Clean ⇒ the row is deleted.
 */
export async function hardDeleteAsset(
  id: string,
  confirmName: string,
): Promise<void> {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Asset not found.");
  }

  if (confirmName !== existing.name) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "The typed name does not match the asset name.",
      "confirmName",
    );
  }

  const auditEntries = await prisma.auditLog.count({
    where: { entityType: "asset", entityId: id },
  });

  if (auditEntries > 0) {
    throw new DomainError(
      "CONFLICT",
      "Cannot delete an asset with linked history — soft-delete it instead.",
    );
  }

  await prisma.asset.delete({ where: { id } });
}
