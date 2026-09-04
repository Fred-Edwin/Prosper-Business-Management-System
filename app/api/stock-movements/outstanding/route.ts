import { NextResponse } from "next/server";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import {
  DomainError,
  listOutstandingPurchases,
  listOutstandingPurchasesForLocation,
  resolveReceivingDestinationIds,
} from "@/lib/domain/stock";

/**
 * GET /api/stock-movements/outstanding — purchase payments awaiting a
 * receipt, and receipts with no matching payment (PRD 4.2).
 *
 * Scoped by DESTINATION, not by the caller's home location (ADR-69):
 *
 * - **Admin**: every location (unchanged, unfiltered).
 * - **Store Manager**: the Store **and** the Restaurant — ADR-67 lands
 *   ingredient deliveries at the Store and goods deliveries at the
 *   Restaurant, and both are the SM's responsibility. Scoping to their
 *   single assigned location hid every Restaurant-destined delivery.
 * - **Canteen Attendant**: the Canteen.
 *
 * A location-bound staff user with no location link is still a
 * misconfiguration → `FORBIDDEN`. The role → destination map lives in
 * `lib/domain/stock/receiving-scope.ts`, shared with the receipt-batch
 * write guard so the read and the write can't drift apart.
 */
export async function GET() {
  const auth = await requireApiRoleIn([
    "admin",
    "store_manager",
    "canteen_attendant",
  ]);
  if (auth instanceof NextResponse) return auth;

  try {
    if (auth.user.role === "admin") {
      return ok(await listOutstandingPurchases());
    }
    const locationId = await resolveActorLocationId(auth.user.id);
    if (!locationId) {
      return fail("FORBIDDEN", "Your account is not assigned to a location.");
    }
    const destinationIds = await resolveReceivingDestinationIds(auth.user.role);
    return ok(await listOutstandingPurchasesForLocation(destinationIds));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
