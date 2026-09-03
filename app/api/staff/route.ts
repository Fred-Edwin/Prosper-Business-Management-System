import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { createStaffSchema, listStaffQuerySchema } from "@/lib/validation/staff";
import { DomainError, createStaff, listStaff } from "@/lib/domain/staff";

// Staff & Pay is entirely Admin-only (PRD §4.8). Reads carry `dailyRate`
// and the linked login state; mutations create/patch a login account —
// nothing here is for any other role.

export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listStaffQuerySchema.safeParse({
    search: sp.get("search") ?? undefined,
    active: sp.get("active") ?? undefined,
    locationId: sp.get("locationId") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await listStaff(parsed.data));
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

  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const staff = await createStaff(parsed.data, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(staff, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
