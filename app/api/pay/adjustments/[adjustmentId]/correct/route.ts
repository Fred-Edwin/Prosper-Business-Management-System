import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctPayAdjustmentSchema } from "@/lib/validation/staff";
import { DomainError, correctPayAdjustment } from "@/lib/domain/staff";

type Ctx = { params: Promise<{ adjustmentId: string }> };

/**
 * `POST /api/pay/adjustments/:adjustmentId/correct` (ADR-72). Admin-only,
 * append-only (ADR-15): the domain writes ONE linked signed-delta
 * `StaffPayAdjustment` row. **No `MoneyMovement`** — a pay adjustment
 * only nets the derived pay figure at read time; it is not a cash-ledger
 * event until a payout is recorded. Not day-close gated.
 * `adjustmentId` must be an original row, never a correction.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { adjustmentId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = correctPayAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const adjustment = await correctPayAdjustment(
      {
        adjustmentId,
        amount: parsed.data.amount,
        note: parsed.data.note,
      },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(adjustment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
