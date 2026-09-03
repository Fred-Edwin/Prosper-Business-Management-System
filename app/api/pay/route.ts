import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  payQuerySchema,
  recordPayAdjustmentSchema,
} from "@/lib/validation/staff";
import {
  DomainError,
  getPayrollSummary,
  getStaffPay,
  recordPayAdjustment,
} from "@/lib/domain/staff";

// Pay is Admin-only (PRD §4.8).

/**
 * `GET /api/pay?month=YYYY-MM` — payroll for every active staff member.
 * `GET /api/pay?month=YYYY-MM&staffId=…` — one staff member's pay.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = payQuerySchema.safeParse({
    month: sp.get("month") ?? undefined,
    staffId: sp.get("staffId") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const { month, staffId } = parsed.data;
    return ok(
      staffId
        ? await getStaffPay(staffId, month)
        : await getPayrollSummary(month),
    );
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/** `POST /api/pay` — record a salary advance or deduction. Day-close gated. */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordPayAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const adjustment = await recordPayAdjustment(parsed.data, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(adjustment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
