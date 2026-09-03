import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  listAttendanceQuerySchema,
  setAttendanceBulkSchema,
  setAttendanceSchema,
} from "@/lib/validation/staff";
import {
  DomainError,
  listAttendance,
  setAttendance,
  setAttendanceBulk,
} from "@/lib/domain/staff";

// Attendance is Admin-only (PRD §4.8). Backdatable by the Admin — no
// today-only rule, no day-close gate (see `lib/domain/staff/attendance.ts`).

export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listAttendanceQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    staffId: sp.get("staffId") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const { from, to, staffId } = parsed.data;
    return ok(await listAttendance(from, to, { staffId }));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `POST /api/attendance` — set one (staffId, date, present).
 * `POST /api/attendance?mode=bulk` — one date, many staff, one transaction.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const actor = { actorId: auth.user.id, role: auth.user.role };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const bulk = req.nextUrl.searchParams.get("mode") === "bulk";

  if (bulk) {
    const parsed = setAttendanceBulkSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
    }
    try {
      const { date, entries } = parsed.data;
      return ok(await setAttendanceBulk(date, entries, actor));
    } catch (e) {
      if (e instanceof DomainError) return fail(e.code, e.message, e.field);
      throw e;
    }
  }

  const parsed = setAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }
  try {
    const { staffId, date, present } = parsed.data;
    return ok(await setAttendance(staffId, date, present, actor));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
