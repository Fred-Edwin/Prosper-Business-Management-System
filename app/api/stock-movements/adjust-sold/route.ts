import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { adjustSoldSchema, listSaleAdjustmentsQuerySchema } from "@/lib/validation/stock";
import { DomainError, adjustSold, listSaleAdjustments } from "@/lib/domain/sales";

/**
 * GET /api/stock-movements/adjust-sold?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Admin-only. The owner sale adjustments (ADR-92) dated in the inclusive
 * range, newest first, for the Sales screen's Adjustments tab and KPI
 * strip.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listSaleAdjustmentsQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const rows = await listSaleAdjustments(parsed.data, {
      userId: auth.user.id,
      role: auth.user.role,
    });
    return ok(rows);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * POST /api/stock-movements/adjust-sold
 *
 * Body: `{ productId, locationId, businessDate, correctedSold, note? }`,
 * the **corrected final** Sold total for that product/location/day (ADR-92).
 * Admin-only. The domain (`adjustSold`) computes the delta against the
 * day's current Sold total and writes one `sale` `StockMovement` plus its
 * paired Cash `sale_adjustment` `MoneyMovement`, so stock and revenue move
 * together.
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

  const parsed = adjustSoldSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const r = await adjustSold(
      {
        productId: parsed.data.productId,
        locationId: parsed.data.locationId,
        businessDate: parsed.data.businessDate,
        correctedSold: parsed.data.correctedSold,
        note: parsed.data.note ?? null,
      },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(r, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
