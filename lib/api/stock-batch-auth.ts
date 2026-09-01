import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { fail } from "@/lib/api/response";

/**
 * Shared auth + location-scoping for the batch movement routes. Mirrors
 * the per-type gate in `POST /api/stock-movements` exactly (a
 * location-bound role may only post a batch for its own location).
 *
 * Returns either a `NextResponse` (short-circuit the handler) or
 * `{ userId, role, actorLocationId }`. `guardLocation(target)` returns a
 * `403` `NextResponse` if a location-bound caller aimed at a foreign
 * location, else `null`.
 */
export async function resolveBatchActor(allowed: readonly Role[]): Promise<
  | NextResponse
  | {
      userId: string;
      role: Role;
      actorLocationId: string | null;
      guardLocation: (target: string) => NextResponse | null;
    }
> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }
  const { id: userId, role } = session.user;

  if (!allowed.includes(role)) {
    return fail(
      "FORBIDDEN",
      "Your role cannot record this kind of stock movement.",
    );
  }

  const actorLocationId = await resolveActorLocationId(userId);
  const isLocationBound = role === "store_manager" || role === "canteen_attendant";
  if (isLocationBound && !actorLocationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a location.");
  }

  const guardLocation = (target: string): NextResponse | null => {
    if (isLocationBound && target !== actorLocationId) {
      return fail(
        "FORBIDDEN",
        "You can only record movements at your own location.",
      );
    }
    return null;
  };

  return { userId, role, actorLocationId, guardLocation };
}
