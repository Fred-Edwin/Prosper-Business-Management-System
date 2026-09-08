import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidPayAdjustment } from "@/lib/domain/staff";

type Ctx = { params: Promise<{ adjustmentId: string }> };

/**
 * `POST /api/pay/adjustments/:adjustmentId/void` (ADR-72). No body.
 * Fully reverses a pay advance / deduction (a correction to zero): one
 * reversal `StaffPayAdjustment` row carrying the negated derived
 * magnitude, same `type`. **No `MoneyMovement`.** Admin-only.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { adjustmentId } = await ctx.params;

  try {
    const adjustment = await voidPayAdjustment(adjustmentId, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(adjustment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
