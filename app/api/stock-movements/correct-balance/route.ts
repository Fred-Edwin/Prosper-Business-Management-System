import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctStockBalanceSchema } from "@/lib/validation/stock";
import { DomainError, correctStockBalance } from "@/lib/domain/stock";

/**
 * POST /api/stock-movements/correct-balance
 *
 * Body: `{ productId, locationId, correctedBalance, note? }` — the
 * **corrected final** derived balance for a product/location pair.
 * Admin-only; the domain (`correctStockBalance`) computes the delta against
 * the current derived balance and writes one append-only `variance`
 * `StockMovement`. Not `[id]/correct` — there is no single movement to
 * target, this corrects the running sum.
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

  const parsed = correctStockBalanceSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const r = await correctStockBalance(
      {
        productId: parsed.data.productId,
        locationId: parsed.data.locationId,
        correctedBalance: parsed.data.correctedBalance,
        note: parsed.data.note ?? null,
        recordedById: auth.user.id,
      },
      { userId: auth.user.id, role: auth.user.role, locationId: null },
    );
    return ok(r, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
