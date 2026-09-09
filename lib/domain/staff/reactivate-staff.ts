import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import { staffInclude, toStaffView } from "./internal";
import type { StaffActor, StaffView } from "./types";

/**
 * Undo a soft-deactivation (mirror of `deactivateStaff`). **Admin-only.**
 * Flips `Staff.active` back to `true` and — critically — `User.active` on
 * the linked login in the SAME transaction, so a re-activated staff member
 * can sign in again (ADR-59: "a future re-activate must flip both flags
 * too"). The auth path gates on `User.active` alone.
 *
 * A re-activated staff member returns with their prior role, location,
 * pay model and rate intact — deactivation only set the flags, it never
 * cleared those fields.
 *
 * Idempotent — re-activating an already-active staff member is a no-op
 * success. `NOT_FOUND` if the id is unknown.
 */
export async function reactivateStaff(
  id: string,
  actor: StaffActor,
): Promise<StaffView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can re-activate staff.",
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
    if (existing.active) {
      return tx.staff.findUniqueOrThrow({ where: { id }, include: staffInclude });
    }

    await tx.staff.update({ where: { id }, data: { active: true } });
    if (existing.user) {
      await tx.user.update({
        where: { id: existing.user.id },
        data: { active: true },
      });
    }
    // No `restore` AuditAction — a staff record is an in-place edit, not a
    // ledger, so `updateStaff` logs `correct`; mirror that here.
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "staff",
        entityId: id,
        newValue: { active: true },
        occurredAt: new Date(),
      },
    });

    return tx.staff.findUniqueOrThrow({ where: { id }, include: staffInclude });
  });

  return toStaffView(row);
}
