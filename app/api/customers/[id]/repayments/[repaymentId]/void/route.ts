import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidRepayment } from "@/lib/domain/customers";

type Ctx = { params: Promise<{ id: string; repaymentId: string }> };

/**
 * `POST /api/customers/:id/repayments/:repaymentId/void` (ADR-72). No
 * body. Fully reverses a debt repayment (a correction to zero): a
 * reversal `Repayment` row carrying the negated derived amount, plus the
 * paired `MoneyMovement` that pulls the money back out. Admin-only.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { repaymentId } = await ctx.params;

  try {
    const repayment = await voidRepayment(repaymentId, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(repayment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
