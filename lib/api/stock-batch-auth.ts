import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { fail } from "@/lib/api/response";
import { resolveReceivingDestinationIds } from "@/lib/domain/stock";

/**
 * Shared auth + location-scoping for the batch movement routes. Mirrors
 * the per-type gate in `POST /api/stock-movements` exactly (a
 * location-bound role may only post a batch for its own location).
 *
 * Returns either a `NextResponse` (short-circuit the handler) or
 * `{ userId, role, actorLocationId }`. `guardLocation(target)` returns a
 * `403` `NextResponse` if a location-bound caller aimed at a foreign
 * location, else `null`.
 *
 * `guardReceivingDestination(target)` is the DELIVERY-receiving variant
 * (ADR-69): a receipt lands where the goods land, not where the receiver
 * sits, so it checks `target` against the role's allowed destinations
 * (`lib/domain/stock/receiving-scope.ts` — SM → Store + Restaurant,
 * attendant → Canteen) instead of the caller's single assigned location.
 * It replaced a one-off "SM may post at a restaurant" lookup inside the
 * receipts route; the same map now drives the `/outstanding` read, so a
 * role can never see a delivery it may not receive. ADR-67's R1 domain
 * guard stays the backstop (goods → Store still rejects).
 */
export async function resolveBatchActor(allowed: readonly Role[]): Promise<
  | NextResponse
  | {
      userId: string;
      role: Role;
      actorLocationId: string | null;
      guardLocation: (target: string) => NextResponse | null;
      guardReceivingDestination: (
        target: string,
      ) => Promise<NextResponse | null>;
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
  // `cashier` is location-bound too (Session 16 — the Restaurant non-sale
  // flow). A cashier only appears in the `allowed` list of the non-sale
  // batch route; the other batch routes reject the role before this
  // matters, so pinning it here is a no-op for them.
  const isLocationBound =
    role === "store_manager" ||
    role === "canteen_attendant" ||
    role === "cashier";
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

  const guardReceivingDestination = async (
    target: string,
  ): Promise<NextResponse | null> => {
    if (!isLocationBound) return null;
    const destinations = await resolveReceivingDestinationIds(role);
    if (destinations.includes(target)) return null;
    return fail(
      "FORBIDDEN",
      "You can only receive deliveries at your own locations.",
    );
  };

  return {
    userId,
    role,
    actorLocationId,
    guardLocation,
    guardReceivingDestination,
  };
}
