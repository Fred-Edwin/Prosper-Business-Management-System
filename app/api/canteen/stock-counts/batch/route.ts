import { NextResponse, type NextRequest } from "next/server";
import { requireActingRole } from "@/lib/api/require-role";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { effectiveRole } from "@/lib/auth/roles";
import { ok, fail } from "@/lib/api/response";
import { recordStockCountBatchSchema } from "@/lib/validation/canteen";
import { DomainError, recordStockCountBatch } from "@/lib/domain/sales";

/**
 * `POST /api/canteen/stock-counts/batch` — the K1 multi-row count: a
 * Canteen Attendant counts several products, then submits once instead
 * of a round trip per product (client UX request, 2026-09-14). Body:
 * `{ lines: [{ productId, countedQuantity, occurredAt? }] }`. One atomic
 * transaction — if any line's counted quantity exceeds its product's
 * expected stock, the whole batch is rejected (`VALIDATION_ERROR`,
 * field `"lines"`), nothing written. Response: `{ data:
 * RecordStockCountResult[] }`, 201.
 */
export async function POST(req: NextRequest) {
  const auth = await requireActingRole("canteen_attendant");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordStockCountBatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth);
  if (!locationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
  }

  try {
    const results = await recordStockCountBatch(
      {
        lines: parsed.data.lines.map((line) => ({
          productId: line.productId,
          countedQuantity: line.countedQuantity,
          occurredAt: line.occurredAt ? new Date(line.occurredAt) : undefined,
        })),
      },
      { userId: auth.user.id, role: effectiveRole(auth), locationId },
    );
    return ok(results, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
