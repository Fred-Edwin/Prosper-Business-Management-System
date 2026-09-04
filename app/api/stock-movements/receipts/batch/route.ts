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
 * Additive — no over-stock block; empty `lines` / duplicate `productId`
 * reject with `VALIDATION_ERROR` (field `"lines"`), nothing written.
 * Response: `{ data: StockMovementView[] }`, 201.
 *
 * Roles: Store Manager / Canteen Attendant (their allowed **destinations**
 * only — ADR-69) or Admin.
 *
 * ADR-67 lands ingredient deliveries at the Store and goods deliveries at
 * the Restaurant (goods can't sit at the Store under the location↔kind
 * model), so the SM fires one batch per target and may post at either.
 * ADR-69 generalises that into the shared receiving-destination map
 * (`lib/domain/stock/receiving-scope.ts`) — SM → Store + Restaurant,
 * Canteen Attendant → Canteen — which the `/outstanding` read shares. The
 * domain's R1 guard is the backstop: a goods line at the Store, or an
 * ingredient line at the Restaurant, still rejects.
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

  // ADR-69: a receipt is guarded by DESTINATION, not by the caller's home
  // location — the SM may receive at the Store and the Restaurant, the
  // attendant at the Canteen. (This replaced a one-off "SM may post at a
  // restaurant" type lookup here; the same map now drives the
  // `/outstanding` read, so what a role can SEE and what it can RECEIVE
  // cannot drift apart.) R1 in the domain is still the backstop — a goods
  // line at the Store, or an ingredient line at the Restaurant, rejects.
  const bad = await actor.guardReceivingDestination(parsed.data.locationId);
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
