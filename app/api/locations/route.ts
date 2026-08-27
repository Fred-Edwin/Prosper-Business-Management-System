import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, listLocations } from "@/lib/domain/catalog";

// API.md lists this as "Roles: all", but in M1 only the Admin catalog
// drawer consumes it. Gated to `admin` for now; widen when another
// consumer (e.g. the cashier order screen) appears. Noted in PROGRESS.md.
export async function GET() {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  try {
    const locations = await listLocations({ activeOnly: true });
    return ok(locations);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
