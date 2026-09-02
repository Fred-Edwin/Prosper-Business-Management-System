import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  listExpensesQuerySchema,
  recordExpenseSchema,
} from "@/lib/validation/financials";
import {
  DomainError,
  listExpenses,
  recordExpense,
} from "@/lib/domain/financials";

/**
 * `/api/expenses` (M3-S4, PRD §4.7). Admin-only. Route stays thin: parse →
 * Zod → auth/role → domain → standard shape. Every business rule (amount
 * > 0, the paired MoneyMovement, day-close gating) lives in the domain.
 *
 *   GET  — list expenses, corrections folded into each row's amount.
 *          Filterable by `from` / `to` business date and `category`.
 *   POST — record an expense (+ its paired negative MoneyMovement).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listExpensesQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    category: sp.get("category") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await listExpenses(parsed.data));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordExpenseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const expense = await recordExpense(parsed.data, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(expense, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
