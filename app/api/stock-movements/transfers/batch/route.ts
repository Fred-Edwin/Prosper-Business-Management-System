import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { resolveBatchActor } from "@/lib/api/stock-batch-auth";
import { ok, fail } from "@/lib/api/response";
import { recordTransferBatchSchema } from "@/lib/validation/stock";
import { DomainError, recordTransferBatch } from "@/lib/domain/stock";

const ROLES: readonly Role[] = ["admin", "store_manager", "canteen_attendant"];

/**
 * POST /api/stock-movements/transfers/batch
 *
 * Multi-line transfer **dispatch**, one atomic transaction. Body:
 * `{ fromLocationId, toLocationId, lines: [{ productId, quantity }] }`.
 * Writes the N dispatch-side (`-q`) rows now; `acceptTransfer` /
 * `flagTransfer` stay single-transfer. Roles: Store Manager / Canteen
 * Attendant (may only dispatch FROM their own location) or Admin. §3.8
 * BLOCK — any line over the derived `from` balance rejects the whole
 * batch (`VALIDATION_ERROR`, field `"lines"`), nothing written. Empty
 * `lines`, duplicate `productId`, or `from === to` also reject. Response:
 * `{ data: StockMovementView[] }`, 201.
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

  const parsed = recordTransferBatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const bad = actor.guardLocation(parsed.data.fromLocationId);
  if (bad) return bad;

  try {
    const rows = await recordTransferBatch({
      fromLocationId: parsed.data.fromLocationId,
      toLocationId: parsed.data.toLocationId,
      lines: parsed.data.lines,
      recordedById: actor.userId,
    });
    return ok(rows, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
