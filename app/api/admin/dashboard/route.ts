import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { nairobiToday } from "@/lib/time";
import { dashboardQuerySchema } from "@/lib/validation/dashboard";
import { DomainError, getDashboard } from "@/lib/domain/dashboard";

/**
 * `GET /api/admin/dashboard?date=YYYY-MM-DD` (M5 S13). **Admin-only.**
 * Read-only — the dashboard writes nothing.
 *
 * Returns the five bands the `/admin` screen renders (see
 * `docs/design/flows/dashboard-screen.md` and `docs/API.md`):
 * `position` (balances now), `week` (7 daily nets + WTD figures + last
 * week's equivalent), `needsAttention`, `today`, `trend` (30 daily nets +
 * total). Every figure is "now" / "today" / "this week" — there is no
 * period picker.
 *
 * `date` defaults to today (Africa/Nairobi). Thin handler per
 * CONVENTIONS §1: parse → Zod → role → domain → standard shape.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = dashboardQuerySchema.safeParse({
    date: req.nextUrl.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await getDashboard(parsed.data.date ?? nairobiToday()));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
