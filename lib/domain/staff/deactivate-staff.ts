import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import { staffInclude, toStaffView } from "./internal";
import type { StaffActor, StaffView } from "./types";

/**
 * Soft-deactivate a staff member (M4). **Admin-only.** `Staff` has no
 * `deletedAt`; `active: false` is the archive.
 *
 * Critically, this ALSO sets `User.active = false` on the linked login in
 * the same transaction. The auth path (`lib/auth/config.ts`) gates sign-in
 * on `User.active` only — it never looks at `Staff.active` — so leaving the
 * `User` active would let a "deactivated" staff member keep logging in.
 * The session callback re-checks `User.active` on every request, so an
 * already-signed-in session is dropped on its very next request too.
 *
 * Idempotent — deactivating an already-inactive staff member is a no-op
 * success. `NOT_FOUND` if the id is unknown.
 */
export async function deactivateStaff(
  id: string,
  actor: StaffActor,
): Promise<StaffView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can deactivate staff.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.staff.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!existing) {
      throw new DomainError("NOT_FOUND", "Staff member not found.");
    }
    if (!existing.active) {
      return tx.staff.findUniqueOrThrow({ where: { id }, include: staffInclude });
    }

    await tx.staff.update({ where: { id }, data: { active: false } });
    if (existing.user) {
      await tx.user.update({
        where: { id: existing.user.id },
        data: { active: false },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "soft_delete",
        entityType: "staff",
        entityId: id,
        occurredAt: new Date(),
      },
    });

    return tx.staff.findUniqueOrThrow({ where: { id }, include: staffInclude });
  });

  return toStaffView(row);
}
