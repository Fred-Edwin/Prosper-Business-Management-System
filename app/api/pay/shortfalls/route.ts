import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, getMonthlyShortfalls } from "@/lib/domain/staff";

// Handover shortfalls for a month, grouped by staff (M4 S9B). Admin-only,
// READ-ONLY, and deliberately separate from `/api/pay` — a shortfall is
// never part of pay arithmetic (PRD §4.8). The Pay & advances screen reads
// this for its standing "settle these separately" list.

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Must be a YYYY-MM month"),
});

/** `GET /api/pay/shortfalls?month=YYYY-MM`. */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = querySchema.safeParse({
    month: req.nextUrl.searchParams.get("month") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await getMonthlyShortfalls(parsed.data.month));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
