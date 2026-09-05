import type { Role, LocationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/domain/catalog/errors";

/**
 * Admin role-switching ("acting as", NOT impersonation) — the backend
 * resolver behind `POST /api/auth/acting-as` and the JWT `update` trigger.
 *
 * See `docs/sprints/role-switching-session-1-handoff.md`. The real Admin
 * identity never changes; this only decides which staff role + location
 * her screens/scoping are pointed at.
 */

/** The three location-bound staff roles the Admin may act as, and the
 * `Location.type` each expects. `admin` is not here — an Admin "acting as
 * admin" is just the normal (cleared) state. */
export const ACTING_AS_LOCATION_TYPE: Record<
  Exclude<Role, "admin">,
  LocationType
> = {
  store_manager: "store",
  cashier: "restaurant",
  canteen_attendant: "canteen",
};

export type ActingAsResolution =
  | { actingAs: null; actingLocationId: null }
  | {
      actingAs: Exclude<Role, "admin">;
      actingLocationId: string;
      locationName: string;
    };

/**
 * Validate a requested acting-as change for a **real Admin** and resolve
 * it to the exact `{ role, locationId, locationName }` to store on the
 * token. Throws `DomainError` (FORBIDDEN / VALIDATION_ERROR / NOT_FOUND)
 * on anything invalid.
 *
 *  - `realRole !== "admin"`            → FORBIDDEN (only a real Admin switches)
 *  - `role: null`                      → clears both fields
 *  - staff `role`, no `locationId`     → VALIDATION_ERROR
 *  - `locationId` missing / inactive / wrong `type` for the role → NOT_FOUND / VALIDATION_ERROR
 *
 * Does **not** hardcode one location per role — the caller (route) is
 * responsible for listing the candidate locations for a picker; this
 * function only confirms the one the caller chose is a real, active,
 * type-matching location.
 */
export async function resolveActingAs(
  realRole: Role,
  role: Role | null,
  locationId: string | undefined,
): Promise<ActingAsResolution> {
  if (realRole !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can switch roles.",
    );
  }

  if (role === null || role === "admin") {
    return { actingAs: null, actingLocationId: null };
  }

  if (!locationId) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "A location is required for this role.",
      "locationId",
    );
  }

  const expectedType = ACTING_AS_LOCATION_TYPE[role];
  const location = await prisma.location.findFirst({
    where: { id: locationId, active: true, type: expectedType },
    select: { id: true, name: true },
  });

  if (!location) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "That location is not a valid active location for this role.",
      "locationId",
    );
  }

  return {
    actingAs: role,
    actingLocationId: location.id,
    locationName: location.name,
  };
}

/**
 * All active locations the Admin could act as for a given staff `role` —
 * the candidate list the frontend picker needs. Empty array means the
 * business has no location of that type set up yet.
 */
export async function listActingAsLocations(
  role: Exclude<Role, "admin">,
): Promise<{ id: string; name: string }[]> {
  return prisma.location.findMany({
    where: { active: true, type: ACTING_AS_LOCATION_TYPE[role] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
