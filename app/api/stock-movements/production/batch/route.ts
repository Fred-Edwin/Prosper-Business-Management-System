import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { resolveBatchActor } from "@/lib/api/stock-batch-auth";
import { ok, fail } from "@/lib/api/response";
import { recordProductionBatchSchema } from "@/lib/validation/stock";
import { DomainError, recordProductionBatch } from "@/lib/domain/stock";

// Production is inherently cross-location (Store Manager, based at the
// Store, produces Dish stock that lands at the Restaurant) — no
// own-location guard; the `store_manager`-only role gate is the control.
const ROLES: readonly Role[] = ["admin", "store_manager"];

/**
 * POST /api/stock-movements/production/batch
 *
 * Multi-line production, one atomic transaction. Body:
 * `{ locationId, lines: [{ productId, quantity }] }` — `locationId` must
 * be the Restaurant; every line's product must be `kind = "dish"`. Roles:
 * Store Manager or Admin. Additive — no over-stock block; empty `lines` /
 * duplicate `productId` reject (`VALIDATION_ERROR`, field `"lines"`),
 * nothing written. Response: `{ data: StockMovementView[] }`, 201.
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

  const parsed = recordProductionBatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const rows = await recordProductionBatch({
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
