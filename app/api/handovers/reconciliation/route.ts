import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { reconciliationQuerySchema } from "@/lib/validation/handovers";
import { DomainError, getReconciliation } from "@/lib/domain/handovers";

/**
 * `GET /api/handovers/reconciliation?date=YYYY-MM-DD` OR
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD` — the Admin reconciliation view's
 * read: declared vs received vs (stored) variance per handover across
 * the business date (or inclusive range), plus range totals and which
 * dates in range are day-closed. Admin-only.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = reconciliationQuerySchema.safeParse({
    date: sp.get("date") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const range =
      "date" in parsed.data && parsed.data.date
        ? parsed.data.date
        : { from: parsed.data.from!, to: parsed.data.to! };
    return ok(await getReconciliation(range));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
