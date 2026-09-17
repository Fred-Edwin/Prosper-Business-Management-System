import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { effectiveRole } from "@/lib/auth/roles";
import { ok, fail } from "@/lib/api/response";
import { recordCompletedTransferSchema } from "@/lib/validation/stock";
import { DomainError, recordCompletedTransfer } from "@/lib/domain/stock";

/**
 * POST /api/stock-movements/transfers/backfill — Admin only.
 *
 * Admin Stock Ledger blank-cell backfill for a transfer that already fully
 * happened on a past day and was never logged (client request,
 * 2026-09-17). Writes both the dispatch and receipt legs together, dated
 * to `businessDate`, skipping the pending/in-transit window
 * `POST /api/stock-movements` (transfer) + `.../accept` normally go
 * through. Unlike every other create path, this one is allowed on an
 * already-closed day for Admin specifically — see
 * `assertDayOpenOrAdminBackfill`.
 *
 * Response: `{ data: { dispatch: StockMovementView, receipt: StockMovementView } }`, 201.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }
  const role = effectiveRole(session);
  if (role !== "admin") {
    return fail(
      "FORBIDDEN",
      "Only an administrator can backfill a transfer.",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordCompletedTransferSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const rows = await recordCompletedTransfer({
      productId: parsed.data.productId,
      fromLocationId: parsed.data.fromLocationId,
      toLocationId: parsed.data.toLocationId,
      quantity: parsed.data.quantity,
      businessDate: parsed.data.businessDate,
      recordedById: session.user.id,
      actorRole: role,
    });
    return ok(rows, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
