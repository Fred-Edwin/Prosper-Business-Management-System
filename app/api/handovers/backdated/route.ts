import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { recordHandoverForDateSchema } from "@/lib/validation/handovers";
import { DomainError, recordHandoverForDate } from "@/lib/domain/handovers";

/**
 * `POST /api/handovers/backdated` (ADR-79) — Admin back-enters a handover
 * a staff member never declared, dated to the business day it belongs
 * to. Distinct path from `POST /api/handovers` (the staff declare
 * endpoint) so the two role guards never tangle.
 *
 * Route stays thin: parse → Zod → role → domain → standard response
 * shape. Every rule (staff/location match, the role-aware day gate, the
 * one-original-per-staff-per-day guard) lives in
 * `recordHandoverForDate`.
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

  const parsed = recordHandoverForDateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const handover = await recordHandoverForDate(parsed.data, {
      userId: auth.user.id,
      role: auth.user.role,
    });
    return ok(handover, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
