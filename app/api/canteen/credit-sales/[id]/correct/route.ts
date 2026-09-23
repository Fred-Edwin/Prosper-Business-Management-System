import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctCanteenCreditSaleSchema } from "@/lib/validation/canteen";
import { DomainError, correctCanteenCreditSale } from "@/lib/domain/sales";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/canteen/credit-sales/:id/correct` (ADR-72/ADR-91). Admin-only,
 * not day-close gated: the domain writes a linked correction `StockMovement`
 * (`correctsMovementId` set) plus a correction `Debt`, both carrying the
 * signed delta between the corrected and current derived quantity. The
 * corrected amount uses the original sale's per-unit price, never today's.
 * `:id` must be an original credit-sale `StockMovement`, never a correction.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = correctCanteenCreditSaleSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const result = await correctCanteenCreditSale(
      { stockMovementId: id, quantity: parsed.data.quantity },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(result, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
