import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { payAllUnpaidSchema, payStaffSchema } from "@/lib/validation/staff";
import {
  DomainError,
  payAllUnpaid,
  payStaff,
} from "@/lib/domain/staff";

// Staff payout is Admin-only (PRD §4.8, ADR-60). A payout creates ONE
// Salaries Expense via the existing `recordExpense` path — cash and Net
// Profit drop exactly once. The amount is recomputed server-side from the
// ledger; there is no client-supplied amount on either payload.

/**
 * `POST /api/pay/payout` — pay one staff member for a month.
 *   Body: `{ staffId, month: "YYYY-MM", paidFromAccount, date: "YYYY-MM-DD" }`.
 *   `201` with `{ data: StaffPay }` (the refreshed pay view, `paid: true`).
 *
 * `POST /api/pay/payout?mode=all` — pay every unpaid active staff member.
 *   Body: `{ month, paidFromAccount, date }` (no `staffId`).
 *   `201` with `{ data: { month, paid: StaffPayoutView[], skipped:
 *   [{ staffId, staffName, reason }] } }`.
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

  const actor = { actorId: auth.user.id, role: auth.user.role };
  const all = req.nextUrl.searchParams.get("mode") === "all";

  if (all) {
    const parsed = payAllUnpaidSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
    }
    try {
      return ok(await payAllUnpaid(parsed.data, actor), { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return fail(e.code, e.message, e.field);
      throw e;
    }
  }

  const parsed = payStaffSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }
  try {
    return ok(await payStaff(parsed.data, actor), { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
