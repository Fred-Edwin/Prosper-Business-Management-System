import { NextResponse, type NextRequest } from "next/server";
import { requireActingRole } from "@/lib/api/require-role";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { effectiveRole } from "@/lib/auth/roles";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidCanteenCreditSale } from "@/lib/domain/sales";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `DELETE /api/canteen/credit-sales/:id` (ADR-91) — a Canteen Attendant
 * undoes a credit sale **they recorded today** (Africa/Nairobi). Always a
 * correction-to-zero (never a hard delete — a `Repayment` may already
 * reference the customer's balance by the time of a void). `FORBIDDEN`
 * for another attendant's sale or after the business day has rolled —
 * then only an Admin correction (`POST .../correct`) applies.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireActingRole("canteen_attendant");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const locationId = await resolveActorLocationId(auth);
  if (!locationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
  }

  try {
    const result = await voidCanteenCreditSale(id, {
      userId: auth.user.id,
      role: effectiveRole(auth),
      locationId,
    });
    return ok(result);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
