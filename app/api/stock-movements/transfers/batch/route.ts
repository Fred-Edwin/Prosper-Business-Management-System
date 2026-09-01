import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
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
 * Attendant or Admin. A Canteen Attendant may only dispatch FROM their
 * own Canteen; the Store Manager dispatches the sellable-output transfer
 * FROM the Restaurant (where production lands it) — the same
 * "inherently cross-location" carve-out the production batch route makes,
 * with the `store_manager` role gate + the Restaurant `type` check as
 * the control. §3.8 BLOCK — any line over the derived `from` balance
 * rejects the whole batch (`VALIDATION_ERROR`, field `"lines"`), nothing
 * written. Empty `lines`, duplicate `productId`, or `from === to` also
 * reject. Response: `{ data: StockMovementView[] }`, 201.
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

  // Own-location guard, with the SM → Restaurant carve-out: the Store
  // Manager's sellable-output transfer is dispatched from the Restaurant,
  // not their home Store. Every other location — and every Canteen
  // Attendant dispatch not from their own Canteen — still 403s.
  const from = parsed.data.fromLocationId;
  let smRestaurantDispatch = false;
  if (actor.role === "store_manager" && from !== actor.actorLocationId) {
    const loc = await prisma.location.findUnique({
      where: { id: from },
      select: { type: true },
    });
    smRestaurantDispatch = loc?.type === "restaurant";
  }
  if (!smRestaurantDispatch) {
    const bad = actor.guardLocation(from);
    if (bad) return bad;
  }

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
