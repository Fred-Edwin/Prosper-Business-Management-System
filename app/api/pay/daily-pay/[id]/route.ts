import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctDailyPaySchema } from "@/lib/validation/staff";
import { DomainError, correctDailyPay } from "@/lib/domain/staff";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `PATCH /api/pay/daily-pay/:id` (ADR-72). Admin-only, append-only
 * (ADR-15): the domain writes ONE linked signed-delta `StaffDailyPay`
 * row. **No `MoneyMovement`** — a pay entry only nets the derived pay
 * figure at read time; it is not a cash-ledger event until a payout is
 * recorded. Not day-close gated. `:id` must be an original entry, never a
 * correction.
 *
 * Body: `{ amount, note? }` — `amount` is the corrected FINAL amount.
 * `201` with `{ data: DailyPayView }` (the new correction row).
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = correctDailyPaySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const entry = await correctDailyPay(
      { dailyPayId: id, amount: parsed.data.amount, note: parsed.data.note },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(entry, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
