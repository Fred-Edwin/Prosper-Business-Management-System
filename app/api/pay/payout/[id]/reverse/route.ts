import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, reversePayout } from "@/lib/domain/staff";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/pay/payout/:id/reverse` (ADR-73). No body. Admin-only.
 *
 * Reverses a recorded staff payout: writes the offsetting Salaries
 * `Expense` correction (to zero) + its paired `MoneyMovement`, restoring
 * Cash and Net Profit, and stamps `StaffPayout.reversedAt` so the
 * staff-month is payable again.
 *
 * `201` with `{ data: StaffPayoutView }` (the reversed row, `reversedAt`
 * set). `409 CONFLICT` if already reversed; `404` if the id is unknown.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const payout = await reversePayout(id, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(payout, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
