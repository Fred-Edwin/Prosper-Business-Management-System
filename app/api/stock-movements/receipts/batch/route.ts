import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { resolveBatchActor } from "@/lib/api/stock-batch-auth";
import { ok, fail } from "@/lib/api/response";
import { recordPurchaseReceiptBatchSchema } from "@/lib/validation/stock";
import { DomainError, recordPurchaseReceiptBatch } from "@/lib/domain/stock";

const ROLES: readonly Role[] = ["admin", "store_manager", "canteen_attendant"];

/**
 * POST /api/stock-movements/receipts/batch
 *
 * Multi-line purchase receipt, one atomic transaction. Body:
 * `{ locationId, lines: [{ productId, quantity, purchasePaymentId? }] }`.
 * Roles: Store Manager / Canteen Attendant (own location only) or Admin.
 * Additive — no over-stock block; empty `lines` / duplicate `productId`
 * reject with `VALIDATION_ERROR` (field `"lines"`), nothing written.
 * Response: `{ data: StockMovementView[] }`, 201.
 */
export async function POST(req: NextRequest) {
  const actor = await resolveBatchActor(ROLES);
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordPurchaseReceiptBatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const bad = actor.guardLocation(parsed.data.locationId);
  if (bad) return bad;

  try {
    const rows = await recordPurchaseReceiptBatch({
      locationId: parsed.data.locationId,
      lines: parsed.data.lines,
      recordedById: actor.userId,
    });
    return ok(rows, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
