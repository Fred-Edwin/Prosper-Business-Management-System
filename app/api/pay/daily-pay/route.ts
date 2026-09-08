import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { recordDailyPaySchema } from "@/lib/validation/staff";
import { DomainError, recordDailyPay } from "@/lib/domain/staff";

// Daily pay is Admin-only (PRD §4.8). One hand-typed amount per (staff,
// business date) for a `daily_entry` staff member (ADR-76). Day-close
// gated (`assertDayOpen`). Writes NO `MoneyMovement` — a pay entry is not
// a cash event until a payout is recorded.

/**
 * `POST /api/pay/daily-pay` — record one daily pay entry.
 *   Body: `{ staffId, amount, date: "YYYY-MM-DD", note? }`.
 *   `201` with `{ data: DailyPayView }`.
 *   `409 CONFLICT` if that staff-day already has an original entry.
 *   `400 VALIDATION_ERROR` if the staff member is on `fixed_daily_rate`.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordDailyPaySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const entry = await recordDailyPay(parsed.data, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(entry, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
