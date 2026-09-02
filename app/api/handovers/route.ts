import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import {
  declareHandoverSchema,
  listHandoversQuerySchema,
} from "@/lib/validation/handovers";
import {
  DomainError,
  declareHandover,
  listHandovers,
} from "@/lib/domain/handovers";

/**
 * `/api/handovers` (M3-S2, PRD §4.5). Route stays thin: parse → Zod →
 * auth/role → domain → standard shape.
 *
 *   GET  — role-scoped list. Admin sees all (filterable by date +
 *          location); Cashier / Canteen Attendant see only their own.
 *   POST — a Cashier or Canteen Attendant declares the day's takings for
 *          their own location. Staff + today-date + open-day gates live in
 *          the domain (ADR-52/53).
 */

const LIST_ROLES: readonly Role[] = [
  "admin",
  "cashier",
  "canteen_attendant",
];
const DECLARE_ROLES: readonly Role[] = ["cashier", "canteen_attendant"];

export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(LIST_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listHandoversQuerySchema.safeParse({
    date: sp.get("date") ?? undefined,
    locationId: sp.get("locationId") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const rows = await listHandovers(parsed.data, {
      userId: auth.user.id,
      role: auth.user.role,
    });
    return ok(rows);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRoleIn(DECLARE_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = declareHandoverSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const handover = await declareHandover(
      {
        cashDeclared: parsed.data.cashDeclared,
        mpesaDeclared: parsed.data.mpesaDeclared,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(handover, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
