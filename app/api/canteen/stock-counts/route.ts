import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRole } from "@/lib/api/require-role";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import {
  recordStockCountSchema,
  listDerivedSalesQuerySchema,
} from "@/lib/validation/canteen";
import { DomainError, recordStockCount, listDerivedSales } from "@/lib/domain/sales";

const GET_ROLES: readonly Role[] = ["admin", "canteen_attendant"];

/**
 * `GET /api/canteen/stock-counts` — per-product canteen derived-sales
 * (PRD §4.4). `admin` → every canteen; `canteen_attendant` → their own.
 * `?productId=&date=` narrow.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(GET_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listDerivedSalesQuerySchema.safeParse({
    productId: sp.get("productId") ?? undefined,
    date: sp.get("date") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth.user.id);

  try {
    const rows = await listDerivedSales(parsed.data, {
      userId: auth.user.id,
      role: auth.user.role,
      locationId,
    });
    return ok(rows);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `POST /api/canteen/stock-counts` — a Canteen Attendant records a stock
 * count; the system derives units sold + revenue for the period since
 * the product's previous count and writes the `StockCount`, a `sale`
 * `StockMovement`, and a `canteen_sale` `MoneyMovement` (Cash).
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole("canteen_attendant");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordStockCountSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth.user.id);
  if (!locationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
  }

  try {
    const result = await recordStockCount(
      {
        productId: parsed.data.productId,
        countedQuantity: parsed.data.countedQuantity,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role, locationId },
    );
    return ok(result, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
