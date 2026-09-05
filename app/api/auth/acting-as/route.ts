import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { actingAsSchema } from "@/lib/validation/auth";
import {
  resolveActingAs,
  listActingAsLocations,
} from "@/lib/auth/acting-as";
import { DomainError } from "@/lib/domain/catalog/errors";

/**
 * `POST /api/auth/acting-as` — Admin role-switching ("acting as", NOT
 * impersonation). See `docs/sprints/role-switching-session-1-handoff.md`.
 *
 * Guard is `requireApiRole("admin")` — the caller's **real** role, never
 * `effectiveRole`: only a real Admin enters or exits acting-as mode, and
 * an Admin who has already switched must still be able to reach this
 * route to switch back.
 *
 * This route does not itself mutate the session cookie (next-auth v4
 * Credentials/JWT can't from a plain handler). It is the authoritative
 * validator: on success the client calls
 * `useSession().update({ actingAs, locationId })`, and the `jwt` callback
 * (`lib/auth/config.ts`) re-runs `resolveActingAs` before writing the
 * token — the client payload is never trusted on its own.
 *
 * Success payload:
 *  - clear:  `{ actingAs: null }`
 *  - set:    `{ actingAs, locationId, locationName, locations: [...] }`
 *    where `locations` is every active location of the matching type, so
 *    the frontend can show a picker when there is more than one.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = actingAsSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const { role, locationId } = parsed.data;

  try {
    const resolved = await resolveActingAs(
      auth.user.role,
      role,
      locationId,
    );

    if (resolved.actingAs === null) {
      return ok({ actingAs: null });
    }

    return ok({
      actingAs: resolved.actingAs,
      locationId: resolved.actingLocationId,
      locationName: resolved.locationName,
      locations: await listActingAsLocations(resolved.actingAs),
    });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
