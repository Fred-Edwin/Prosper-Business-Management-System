import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctPurchasePaymentSchema } from "@/lib/validation/stock";
import { DomainError, correctPurchasePayment } from "@/lib/domain/stock";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/stock-movements/:id/correct-purchase
 *
 * Body: `{ supplier?, orderedQty, cost, paidFromAccount, note? }` — the
 * **corrected final** values of a `purchase_payment` row. Admin-only; the
 * domain (`correctPurchasePayment`) computes the cost delta, writes an
 * append-only correction `StockMovement`, the paired `MoneyMovement`
 * delta(s), and resets the catalog buying price (ADR-15 / CONVENTIONS §4).
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

  const parsed = correctPurchasePaymentSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const r = await correctPurchasePayment(
      {
        movementId: id,
        supplier: parsed.data.supplier ?? null,
        orderedQty: parsed.data.orderedQty,
        cost: parsed.data.cost,
        paidFromAccount: parsed.data.paidFromAccount,
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
