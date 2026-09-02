import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  closeDayBodySchema,
  reopenDayBodySchema,
  dayStatusQuerySchema,
} from "@/lib/validation/day-close";
import {
  DomainError,
  closeDay,
  reopenDay,
  listDayCloses,
  getDayStatus,
} from "@/lib/domain/audit";

/**
 * `/api/day-close` (M3-S1 / ADR-52). Admin-only, all verbs. Route stays
 * thin: parse → Zod → role → domain → standard shape.
 *
 *   GET    — `{ today, recent }`: today's status + the recent closed
 *            dates. `?date=YYYY-MM-DD` narrows `today` to that date.
 *   POST   — `{ date }`: seal a business date. `CONFLICT` if already closed.
 *   DELETE — `{ date }`: reopen a closed date (low-friction toggle).
 *            `NOT_FOUND` if it is not closed. Every reopen writes AuditLog.
 */

export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = dayStatusQuerySchema.safeParse({
    date: req.nextUrl.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const [today, recent] = await Promise.all([
      getDayStatus(parsed.data.date),
      listDayCloses(),
    ]);
    return ok({ today, recent });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = closeDayBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const closed = await closeDay(parsed.data.date, auth.user.id);
    return ok(closed, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = reopenDayBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const result = await reopenDay(parsed.data.date, auth.user.id);
    return ok(result);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
