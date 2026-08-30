import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidStockCount } from "@/lib/domain/sales";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `DELETE /api/canteen/stock-counts/:id` — a Canteen Attendant undoes a
 * stock count **they recorded today** (Africa/Nairobi). A count is not
 * editable; it is hard-deleted (with its `sale` `StockMovement` and
 * `canteen_sale` `MoneyMovement`) and re-recorded. `FORBIDDEN` for
 * another attendant's count or after the business day has rolled — then
 * only an Admin correction path (a later session) applies.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("canteen_attendant");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const locationId = await resolveActorLocationId(auth.user.id);
  if (!locationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
  }

  try {
    const result = await voidStockCount(id, {
      userId: auth.user.id,
      role: auth.user.role,
      locationId,
    });
    return ok(result);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
