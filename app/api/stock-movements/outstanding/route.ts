import { NextResponse } from "next/server";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import {
  DomainError,
  listOutstandingPurchases,
  listOutstandingPurchasesForLocation,
} from "@/lib/domain/stock";

/**
 * GET /api/stock-movements/outstanding — purchase payments awaiting a
 * receipt, and receipts with no matching payment (PRD 4.2).
 *
 * - **Admin**: every location (unchanged).
 * - **Store Manager**: hard-scoped to their assigned location — the
 *   Receive flow's "match a delivery the Admin already paid for" picker
 *   (3-DOMAIN §3.4). An SM with no location link → `FORBIDDEN`.
 */
export async function GET() {
  const auth = await requireApiRoleIn(["admin", "store_manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    if (auth.user.role === "admin") {
      return ok(await listOutstandingPurchases());
    }
    const locationId = await resolveActorLocationId(auth.user.id);
    if (!locationId) {
      return fail("FORBIDDEN", "Your account is not assigned to a location.");
    }
    return ok(await listOutstandingPurchasesForLocation(locationId));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
