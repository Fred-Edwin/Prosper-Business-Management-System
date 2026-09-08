import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidDailyPay } from "@/lib/domain/staff";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/pay/daily-pay/:id/void` (ADR-72). No body. Fully reverses a
 * daily pay entry (a correction to zero): one reversal `StaffDailyPay`
 * row carrying the negated derived amount. **No `MoneyMovement`.**
 * Admin-only. `:id` must be an original entry.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const entry = await voidDailyPay(id, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(entry, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
