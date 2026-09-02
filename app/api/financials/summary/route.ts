import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { financialSummaryQuerySchema } from "@/lib/validation/financials";
import { DomainError, getFinancialSummary } from "@/lib/domain/financials";

/**
 * `GET /api/financials/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (M3-S4, PRD
 * §4.7 / SCHEMA §14). Admin-only. Returns revenue, COGS (Goods + blended
 * Dish), gross profit, total expenses, net profit, debts owed to the
 * business, the owner "owed to business" figure and the two account
 * balances — per location and consolidated. Nothing is stored; every
 * number is summed from the ledger on read.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = financialSummaryQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await getFinancialSummary(parsed.data.from, parsed.data.to));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
