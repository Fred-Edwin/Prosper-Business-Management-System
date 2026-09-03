import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import {
  createStockMovementSchema,
  listMovementsQuerySchema,
} from "@/lib/validation/stock";
import {
  DomainError,
  listMovements,
  setOpeningStock,
  recordPurchasePayment,
  recordPurchaseReceipt,
  recordKitchenIssue,
  recordProduction,
  recordTransfer,
  recordNonSaleConsumption,
} from "@/lib/domain/stock";

// Route Handlers are dynamic by default (they hit the DB and the session);
// no caching config needed.

const STOCK_ROLES: readonly Role[] = [
  "admin",
  "store_manager",
  "canteen_attendant",
];

/** GET /api/stock-movements — role-scoped list. */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(STOCK_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listMovementsQuerySchema.safeParse({
    productId: sp.get("productId") ?? undefined,
    locationId: sp.get("locationId") ?? undefined,
    movementType: sp.get("movementType") ?? undefined,
    date: sp.get("date") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth.user.id);

  try {
    const rows = await listMovements(parsed.data, {
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
 * POST /api/stock-movements — dispatch on `body.movementType` to the
 * matching domain function, after the per-type role / location check.
 * No business logic here beyond "which role, which location".
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }
  const { id: userId, role } = session.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = createStockMovementSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }
  const input = parsed.data;

  // Per-type role gate (API.md "Stock Movements").
  const allowed: Record<typeof input.movementType, readonly Role[]> = {
    opening: ["admin"],
    purchase_payment: ["admin"],
    purchase_receipt: ["store_manager", "canteen_attendant"],
    issue: ["store_manager"],
    production: ["store_manager"],
    transfer: ["store_manager", "canteen_attendant"],
    non_sale_consumption: ["admin", "store_manager", "canteen_attendant"],
  };
  if (!allowed[input.movementType].includes(role)) {
    return fail(
      "FORBIDDEN",
      "Your role cannot record this kind of stock movement.",
    );
  }

  // Location scoping: a location-bound role may only write to its own
  // location. `resolveActorLocationId` is null for admin.
  const actorLocationId = await resolveActorLocationId(userId);
  const isLocationBound =
    role === "store_manager" || role === "canteen_attendant";
  if (isLocationBound && !actorLocationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a location.");
  }
  const guardLocation = (target: string): NextResponse | null => {
    if (isLocationBound && target !== actorLocationId) {
      return fail("FORBIDDEN", "You can only record movements at your own location.");
    }
    return null;
  };

  try {
    switch (input.movementType) {
      case "opening": {
        const r = await setOpeningStock({
          productId: input.productId,
          locationId: input.locationId,
          businessDate: input.businessDate,
          quantity: input.quantity,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
      case "purchase_payment": {
        const r = await recordPurchasePayment({
          productId: input.productId,
          locationId: input.locationId,
          supplier: input.supplier,
          quantity: input.quantity,
          cost: input.cost,
          paidFromAccount: input.paidFromAccount,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
      case "purchase_receipt": {
        const bad = guardLocation(input.locationId);
        if (bad) return bad;
        const r = await recordPurchaseReceipt({
          productId: input.productId,
          locationId: input.locationId,
          quantity: input.quantity,
          purchasePaymentId: input.purchasePaymentId ?? null,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
      case "issue": {
        const bad = guardLocation(input.locationId);
        if (bad) return bad;
        const r = await recordKitchenIssue({
          productId: input.productId,
          locationId: input.locationId,
          quantity: input.quantity,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
      case "production": {
        // Production is inherently cross-location: the Store Manager (based
        // at the Store) produces Dish stock that lands at the Restaurant.
        // The own-location guard does not apply; the `store_manager`-only
        // role gate above is the control.
        const r = await recordProduction({
          productId: input.productId,
          locationId: input.locationId,
          quantity: input.quantity,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
      case "transfer": {
        const bad = guardLocation(input.fromLocationId);
        if (bad) return bad;
        const r = await recordTransfer({
          productId: input.productId,
          fromLocationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          quantity: input.quantity,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
      case "non_sale_consumption": {
        const bad = guardLocation(input.locationId);
        if (bad) return bad;
        const r = await recordNonSaleConsumption({
          productId: input.productId,
          locationId: input.locationId,
          quantity: input.quantity,
          reason: input.reason,
          reasonNote: input.reasonNote ?? null,
          recordedById: userId,
        });
        return ok(r, { status: 201 });
      }
    }
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
