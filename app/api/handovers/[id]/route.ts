import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { editOwnHandoverSchema } from "@/lib/validation/handovers";
import { DomainError, editOwnHandover } from "@/lib/domain/handovers";

const STAFF_ROLES: readonly Role[] = ["cashier", "canteen_attendant"];

type Ctx = { params: Promise<{ id: string }> };

/**
 * `PATCH /api/handovers/:id` — a staff member's true edit of their own
 * declaration, before the day is closed and before a receipt is
 * recorded. Ownership / day-close / today-date / receipt-exists rules are
 * all in the domain.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRoleIn(STAFF_ROLES);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = editOwnHandoverSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const handover = await editOwnHandover(id, parsed.data, {
      userId: auth.user.id,
      role: auth.user.role,
    });
    return ok(handover);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
