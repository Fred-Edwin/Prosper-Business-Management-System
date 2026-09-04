import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { dashboardTrendQuerySchema } from "@/lib/validation/dashboard";
import { dailyNetSeries } from "@/lib/domain/dashboard";

/**
 * `GET /api/admin/dashboard/trend?from=&to=` (v2 Dashboard Session B).
 * **Admin-only.** Read-only.
 *
 * A narrow, additive exposure of `dailyNetSeries` (ADR-64) for the v2
 * period trend bar strip (`docs/design/flows/dashboard-screen.md`, "Trend
 * charts"), which needs daily net profit over the PERIOD CONTROL's exact
 * `[from, to]` range — not always-30-days-ending-today like
 * `GET /api/admin/dashboard`'s `trend` band, and not always-this-week
 * like its `week` band. This does NOT replace either of those; it is a
 * third, period-scoped read the client buckets client-side (daily for
 * Today/This week, weekly for This month — see `use-dashboard-trend.ts`).
 *
 * `GET /api/admin/dashboard` deliberately stays `date`-only (Session A's
 * decision, `docs/API.md` "Dashboard" v2 note) — this is a separate
 * route, not a param added to that aggregator.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = dashboardTrendQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }
  const { from, to } = parsed.data;
  if (from > to) {
    return fail("VALIDATION_ERROR", "from must not be after to.", "from");
  }

  const series = await dailyNetSeries(from, to);
  return ok({
    from,
    to,
    dailyNet: series.map((d) => ({ date: d.date, net: d.net.toFixed(2) })),
  });
}
