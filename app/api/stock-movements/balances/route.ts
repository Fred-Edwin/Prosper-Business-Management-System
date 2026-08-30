import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import { businessDateEndUtc } from "@/lib/time";
import { DomainError, getDerivedStockBalances } from "@/lib/domain/stock";

// Route Handlers are dynamic by default (DB + session). No caching config.

// The Cashier's C2 New-Order grid reads the derived Restaurant balance
// per product for the §3.8 over-stock block (a courtesy — the server is
// the gate). Location scoping below still confines a location-bound role
// to its own location; the Cashier is not location-bound.
const STOCK_ROLES: readonly Role[] = [
  "admin",
  "store_manager",
  "canteen_attendant",
  "cashier",
];

const querySchema = z.object({
  // Comma-separated product ids. Non-empty after splitting.
  productIds: z
    .string()
    .min(1, "productIds is required")
    .transform((s) => s.split(",").map((p) => p.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0, "productIds is required"),
  locationId: z.string().min(1, "locationId is required"),
  // Optional business date (YYYY-MM-DD). The balance is summed over every
  // row up to the END of that business day — i.e. the day's closing figure.
  // Omit for "as of now".
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date")
    .optional(),
});

/**
 * GET /api/stock-movements/balances
 *
 * Batched derived-balance read (ADR-40). The Session-6 domain shipped
 * `getDerivedStockBalances` but no route; the Admin Stock ledger needs a
 * product's balance *as of the end of a business day* to render the
 * Opening column (= the prior day's Closing, ADR-11) without an N+1 of
 * single-balance calls.
 *
 * Query: `?productIds=a,b,c&locationId=...&asOf=YYYY-MM-DD`. `asOf` is a
 * business date; the balance sums every movement whose `occurredAt` is
 * before the *end* of that Africa/Nairobi day. Omit `asOf` for "now".
 *
 * Roles: same as `GET /api/stock-movements`. A location-bound caller may
 * only read balances at its own location (a foreign `locationId` → `[]`,
 * mirroring `listMovements`).
 *
 * Response: `{ data: [{ productId, locationId, quantity }] }` — one entry
 * per requested product id, `"0.0000"` when the product has no rows.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(STOCK_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    productIds: sp.get("productIds") ?? "",
    locationId: sp.get("locationId") ?? "",
    asOf: sp.get("asOf") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }
  const { productIds, locationId, asOf } = parsed.data;

  // Location scoping (mirrors listMovements): a location-bound role may
  // only read its own location; a foreign locationId short-circuits to [].
  const actorLocationId = await resolveActorLocationId(auth.user.id);
  const isLocationBound =
    auth.user.role === "store_manager" ||
    auth.user.role === "canteen_attendant";
  if (isLocationBound) {
    if (!actorLocationId) {
      return fail("FORBIDDEN", "Your account is not assigned to a location.");
    }
    if (locationId !== actorLocationId) {
      return ok([]);
    }
  }

  const at = asOf ? businessDateEndUtc(asOf) : undefined;

  try {
    const balances = await getDerivedStockBalances(productIds, locationId, at);
    return ok(balances);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
