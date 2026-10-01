import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { voidExpenseSchema } from "@/lib/validation/financials";
import { DomainError, voidExpense } from "@/lib/domain/financials";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/expenses/:id/void` (ADR-96). Admin-only, append-only: the domain
 * writes a reversing `Expense` row plus a paired MoneyMovement so the expense
 * nets to zero. Not day-close gated. `id` must be an original expense.
 * The body is optional (`{ note? }`).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown = {};
  const text = await req.text();
  if (text.trim() !== "") {
    try {
      body = JSON.parse(text);
    } catch {
      return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
    }
  }

  const parsed = voidExpenseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const expense = await voidExpense(
      { expenseId: id, note: parsed.data.note },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(expense);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
