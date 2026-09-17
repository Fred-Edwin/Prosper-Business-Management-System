import { NextResponse, type NextRequest } from "next/server";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidPurchaseReceipt } from "@/lib/domain/stock";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/stock-movements/:id/void-receipt
 *
 * No body. Fully reverses a `purchase_receipt` (a correction to zero,
 * ADR-15): a reversal `StockMovement` and, when the receipt is matched to
 * a payment, clearing that payment's link so it returns to
 * `awaitingReceipt` and becomes correctable/voidable again (the fix for
 * the matched-payment deadlock — see `voidPurchaseReceipt`'s doc comment).
 *
 * Roles: `admin` (any day) or `store_manager` / `canteen_attendant` (their
 * own same-day entry) — the domain's `assertActorMayCorrectOnDate` is the
 * actual gate, same rule `correctMovement` uses; this route only checks
 * the coarse role allowlist, not ownership or location (there is no
 * location scoping on a correction the way there is on a create — a
 * receipt is location-agnostic to *who* may undo it, only *when*).
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRoleIn([
    "admin",
    "store_manager",
    "canteen_attendant",
  ]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const r = await voidPurchaseReceipt(
      { movementId: id, recordedById: auth.user.id },
      { userId: auth.user.id, role: auth.user.role, locationId: null },
    );
    return ok(r, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
