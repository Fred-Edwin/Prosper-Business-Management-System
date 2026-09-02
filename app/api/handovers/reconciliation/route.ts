import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { reconciliationQuerySchema } from "@/lib/validation/handovers";
import { DomainError, getReconciliation } from "@/lib/domain/handovers";

/**
 * `GET /api/handovers/reconciliation?date=YYYY-MM-DD` — the Admin
 * reconciliation view's read: declared vs received vs (stored) variance
 * per handover for a business date, plus day totals. Admin-only.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = reconciliationQuerySchema.safeParse({
    date: req.nextUrl.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await getReconciliation(parsed.data.date));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
