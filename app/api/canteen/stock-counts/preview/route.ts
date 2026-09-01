import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import { previewStockCountQuerySchema } from "@/lib/validation/canteen";
import { DomainError, previewStockCount } from "@/lib/domain/sales";

const PREVIEW_ROLES: readonly Role[] = ["admin", "canteen_attendant"];

/**
 * `GET /api/canteen/stock-counts/preview?productId=&countedRemaining=` —
 * a **dry-run** of the canteen derived sale for a counted-remaining value.
 * Persists nothing (no `StockCount` / `StockMovement` / `MoneyMovement` /
 * `AuditLog`). Feeds the K1 preview card.
 *
 * Role-scoped identically to `POST /api/canteen/stock-counts`:
 * `canteen_attendant` (their assigned canteen) + `admin`. Thin handler —
 * parse → Zod → auth → domain → respond.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(PREVIEW_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = previewStockCountQuerySchema.safeParse({
    productId: sp.get("productId") ?? undefined,
    countedRemaining: sp.get("countedRemaining") ?? undefined,
    occurredAt: sp.get("occurredAt") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  const locationId = await resolveActorLocationId(auth.user.id);
  if (!locationId) {
    return fail("FORBIDDEN", "Your account is not assigned to a canteen.");
  }

  try {
    const preview = await previewStockCount(
      {
        productId: parsed.data.productId,
        countedRemaining: parsed.data.countedRemaining,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role, locationId },
    );
    return ok(preview);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
