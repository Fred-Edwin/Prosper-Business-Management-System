import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidPurchasePayment } from "@/lib/domain/stock";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/stock-movements/:id/void-purchase
 *
 * No body. Fully reverses a `purchase_payment` (a correction to zero,
 * ADR-15): a reversal `StockMovement`, a `MoneyMovement` refunding the
 * paid-from account, and the catalog buying price rolled back to what it
 * was before the payment. Admin-only.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const r = await voidPurchasePayment(id, {
      userId: auth.user.id,
      role: auth.user.role,
      locationId: null,
    });
    return ok(r, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
