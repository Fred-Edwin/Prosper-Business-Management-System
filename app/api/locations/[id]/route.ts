import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { updateLocationSchema } from "@/lib/validation/locations";
import {
  DomainError,
  deactivateLocation,
  updateLocation,
} from "@/lib/domain/catalog";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `PATCH /api/locations/:id` — edit a location in place (name / type /
 * active). Admin-only.
 *
 * `PATCH /api/locations/:id?mode=deactivate` — soft-deactivate, running
 * the referential guard first (409 if active staff / stock on hand /
 * pending transfers). Body is ignored in this mode.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (req.nextUrl.searchParams.get("mode") === "deactivate") {
    try {
      return ok(await deactivateLocation(id));
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

  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await updateLocation(id, parsed.data));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
