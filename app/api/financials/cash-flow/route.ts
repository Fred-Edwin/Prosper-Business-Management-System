import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { financialSummaryQuerySchema } from "@/lib/validation/financials";
import { DomainError, getCashFlow } from "@/lib/domain/financials";

/**
 * `GET /api/financials/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD` (client
 * feedback item #7). Admin-only. Returns every `MoneyMovement` in the
 * range, unified across both accounts and sorted chronologically, with an
 * ADR-57 opening/closing balance per account and a running balance per
 * row. Nothing is stored; every figure is read from the ledger. Same
 * `{ from, to }` query shape as `/api/financials/summary` — reuses its
 * schema.
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
    return ok(await getCashFlow(parsed.data.from, parsed.data.to));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
