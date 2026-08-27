import { prisma } from "@/lib/db";

/**
 * Resolve the location a user is scoped to, for the F2 stock endpoints.
 *
 * `User` has no `locationId` column — a staff user links to `Staff` via
 * `staffId`, and `Staff.locationId` is the location. `admin` has no
 * location (sees everywhere); `store_manager` / `canteen_attendant` are
 * bound to their `Staff.location`.
 *
 * Returns `null` for admin, or when a location-bound user has no staff
 * link (a misconfiguration the domain layer turns into `FORBIDDEN`).
 */
export async function resolveActorLocationId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, staff: { select: { locationId: true } } },
  });
  if (!user || user.role === "admin") return null;
  return user.staff?.locationId ?? null;
}
