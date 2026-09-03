import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { dayDetailQuerySchema } from "@/lib/validation/audit";
import { DomainError, getDayDetail } from "@/lib/domain/audit";

/**
 * `GET /api/audit/day-detail?date=YYYY-MM-DD` (M5 S11). Admin-only,
 * read-only. Everything that happened on one Africa/Nairobi business
 * date — orders, stock movements, handovers (+ receipts), expenses,
 * owner transactions, stock counts, payouts — plus whether the day is
 * closed and by whom.
 *
 * Composed from the existing per-module reads, so figures reconcile with
 * `GET /api/financials/summary?from=DATE&to=DATE` (proven by the S11
 * reconciliation test). An empty date returns empty collections, never
 * an error.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = dayDetailQuerySchema.safeParse({
    date: req.nextUrl.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await getDayDetail(parsed.data.date));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
