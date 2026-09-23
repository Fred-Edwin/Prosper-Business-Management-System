import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireActingRole } from "@/lib/api/require-role";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { effectiveRole } from "@/lib/auth/roles";
import { ok, fail } from "@/lib/api/response";
import {
  recordCanteenCreditSaleSchema,
  listCanteenCreditSalesQuerySchema,
} from "@/lib/validation/canteen";
import {
  DomainError,
  recordCanteenCreditSale,
  listCanteenCreditSales,
} from "@/lib/domain/sales";

const GET_ROLES: readonly Role[] = ["admin", "canteen_attendant"];

/**
 * `GET /api/canteen/credit-sales?date=` (ADR-91) — the attendant hub's
 * "today's credit sales" recap. `admin` → every canteen; `canteen_attendant`
 * → their own. `date` defaults to today (Africa/Nairobi).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(GET_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listCanteenCreditSalesQuerySchema.safeParse({
    date: sp.get("date") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth);

  try {
    const rows = await listCanteenCreditSales(parsed.data, {
      userId: auth.user.id,
      role: effectiveRole(auth),
      locationId,
    });
    return ok(rows);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `POST /api/canteen/credit-sales` (ADR-91) — a Canteen Attendant sells a
 * product to a customer on credit: stock reduces immediately (a `sale`
 * `StockMovement`) and a `Debt` is created (no money moves yet).
 */
export async function POST(req: NextRequest) {
  const auth = await requireActingRole("canteen_attendant");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordCanteenCreditSaleSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth);
  if (!locationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
  }

  try {
    const result = await recordCanteenCreditSale(
      {
        productId: parsed.data.productId,
        customerId: parsed.data.customerId,
        quantity: parsed.data.quantity,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: effectiveRole(auth), locationId },
    );
    return ok(result, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
