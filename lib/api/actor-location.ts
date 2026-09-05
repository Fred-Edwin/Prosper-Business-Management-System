import type { Session } from "next-auth";
import { prisma } from "@/lib/db";
import { effectiveRole } from "@/lib/auth/roles";

/**
 * Resolve the location a request is scoped to, for the F2 stock endpoints.
 *
 * `User` has no `locationId` column — a staff user links to `Staff` via
 * `staffId`, and `Staff.locationId` is the location. `admin` has no
 * location (sees everywhere); `store_manager` / `canteen_attendant` are
 * bound to their `Staff.location`.
 *
 * **Admin role-switching:** when an Admin is acting as a staff role she
 * has no `Staff` row, so her scoped location is the one she picked when
 * she switched — `session.user.actingLocationId`, carried on the JWT
 * alongside `actingAs`. Pass the `Session` to opt into this; callers that
 * still pass only a `userId` string get the pre-role-switching behaviour
 * (used where no session is threaded through, e.g. batch auth by id).
 *
 * Returns `null` for a real admin (not acting as anyone), or when a
 * location-bound user has no staff link (a misconfiguration the domain
 * layer turns into `FORBIDDEN`).
 */
export async function resolveActorLocationId(
  actor: string | Session,
): Promise<string | null> {
  if (typeof actor !== "string") {
    // Session in hand — an Admin acting as a staff role is scoped to the
    // location she selected, not to any `Staff` row (she has none).
    if (actor.user.actingAs && effectiveRole(actor) !== "admin") {
      return actor.user.actingLocationId ?? null;
    }
    return resolveByUserId(actor.user.id);
  }
  return resolveByUserId(actor);
}

async function resolveByUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, staff: { select: { locationId: true } } },
  });
  if (!user || user.role === "admin") return null;
  return user.staff?.locationId ?? null;
}
