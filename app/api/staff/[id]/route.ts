import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { updateStaffSchema } from "@/lib/validation/staff";
import {
  DomainError,
  deactivateStaff,
  getStaff,
  updateStaff,
} from "@/lib/domain/staff";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const staff = await getStaff(id);
  if (!staff) return fail("NOT_FOUND", "Staff member not found.");
  return ok(staff);
}

/**
 * `PATCH /api/staff/:id` — edit name / role / locationId / dailyRate, or
 * reset the PIN. Admin-only.
 *
 * `PATCH /api/staff/:id?mode=deactivate` — soft-deactivate and disable the
 * linked login. Body ignored.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const actor = { actorId: auth.user.id, role: auth.user.role };

  if (req.nextUrl.searchParams.get("mode") === "deactivate") {
    try {
      return ok(await deactivateStaff(id, actor));
    } catch (e) {
      if (e instanceof DomainError) return fail(e.code, e.message, e.field);
      throw e;
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await updateStaff(id, parsed.data, actor));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
