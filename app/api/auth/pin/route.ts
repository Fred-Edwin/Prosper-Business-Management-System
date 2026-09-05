import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { changeOwnPinSchema } from "@/lib/validation/auth";
import { changeOwnPin } from "@/lib/auth/change-own-pin";
import { DomainError } from "@/lib/domain/catalog/errors";

const ANY_ROLE = ["admin", "store_manager", "cashier", "canteen_attendant"] as const;

/**
 * `PATCH /api/auth/pin` — self-service PIN change for the signed-in user,
 * any role. Distinct from `PATCH /api/staff/:id`, which is the Admin
 * resetting a *staff* member's PIN and doesn't apply to the Admin's own
 * account (the Admin has no `Staff` row).
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireApiRoleIn(ANY_ROLE);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = changeOwnPinSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    await changeOwnPin(
      auth.user.id,
      parsed.data.currentPin,
      parsed.data.newPin,
    );
    return ok({ success: true });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
