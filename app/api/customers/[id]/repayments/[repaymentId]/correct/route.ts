import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctRepaymentSchema } from "@/lib/validation/customers";
import { DomainError, correctRepayment } from "@/lib/domain/customers";

type Ctx = { params: Promise<{ id: string; repaymentId: string }> };

/**
 * `POST /api/customers/:id/repayments/:repaymentId/correct` (ADR-72).
 * Admin-only, append-only (ADR-15): the domain writes a linked delta
 * `Repayment` row (signed `amount` delta) plus the paired
 * `MoneyMovement`. Not day-close gated. `repaymentId` must be an original
 * row, never a correction.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { repaymentId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = correctRepaymentSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const repayment = await correctRepayment(
      {
        repaymentId,
        amount: parsed.data.amount,
        account: parsed.data.account,
        note: parsed.data.note,
      },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(repayment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
