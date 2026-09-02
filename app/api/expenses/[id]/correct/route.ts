import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctExpenseSchema } from "@/lib/validation/financials";
import { DomainError, correctExpense } from "@/lib/domain/financials";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/expenses/:id/correct` (M3-S4). Admin-only, append-only
 * (ADR-15): the domain writes a new `Expense` delta row linked via
 * `correctsExpenseId` plus a paired delta MoneyMovement. Not day-close
 * gated. `id` must be an original expense, never a correction row.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = correctExpenseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const expense = await correctExpense(
      { expenseId: id, amount: parsed.data.amount, note: parsed.data.note },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(expense);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
