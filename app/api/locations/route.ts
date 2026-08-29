import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { DomainError, listLocations } from "@/lib/domain/catalog";

// API.md: "widen to all when a second consumer appears" — the staff stock
// hooks (`useStaffStock` / `useStockLevels`) now consume this for the
// transfer destination picker and the location scope. The list is
// non-sensitive (active locations, name only); reads are role-scoped to
// these three roles, mutations live elsewhere.
const LOCATION_READ_ROLES: readonly Role[] = [
  "admin",
  "store_manager",
  "canteen_attendant",
];

export async function GET() {
  const auth = await requireApiRoleIn(LOCATION_READ_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const locations = await listLocations({ activeOnly: true });
    return ok(locations);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
