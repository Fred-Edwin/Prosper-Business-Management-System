import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRole } from "@/lib/api/require-role";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { createLocationSchema } from "@/lib/validation/locations";
import { DomainError, createLocation, listLocations } from "@/lib/domain/catalog";

// API.md: "widen to all when a second consumer appears" — the staff stock
// hooks (`useStaffStock` / `useStockLevels`) now consume this for the
// transfer destination picker and the location scope. The list is
// non-sensitive (active locations, name only); reads are role-scoped to
// these three roles, mutations (POST here, PATCH in `[id]`) are admin-only.
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

export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await createLocation(parsed.data), { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
