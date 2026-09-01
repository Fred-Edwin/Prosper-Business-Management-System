import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { resolveBatchActor } from "@/lib/api/stock-batch-auth";
import { ok, fail } from "@/lib/api/response";
import { recordNonSaleConsumptionBatchSchema } from "@/lib/validation/stock";
import { DomainError, recordNonSaleConsumptionBatch } from "@/lib/domain/stock";

const ROLES: readonly Role[] = ["admin", "store_manager", "canteen_attendant"];

/**
 * POST /api/stock-movements/non-sale/batch
 *
 * Multi-line non-sale consumption, one atomic transaction. Body:
 * `{ locationId, reason, note?, lines: [{ productId, quantity }] }` — one
 * `reason` (+ `note` iff `reason === "other"`) for the whole batch. Roles:
 * Store Manager / Canteen Attendant (own location only) or Admin. §3.8
 * BLOCK — any line over the derived balance rejects the whole batch
 * (`VALIDATION_ERROR`, field `"lines"`), nothing written. Empty `lines` /
 * duplicate `productId` also reject. Response: `{ data:
 * StockMovementView[] }`, 201.
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

  const parsed = recordNonSaleConsumptionBatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const bad = actor.guardLocation(parsed.data.locationId);
  if (bad) return bad;

  try {
    const rows = await recordNonSaleConsumptionBatch({
      locationId: parsed.data.locationId,
      reason: parsed.data.reason,
      note: parsed.data.note ?? null,
      lines: parsed.data.lines,
      recordedById: actor.userId,
    });
    return ok(rows, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
