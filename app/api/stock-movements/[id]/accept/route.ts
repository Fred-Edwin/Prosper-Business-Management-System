import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { resolveActorLocationId } from "@/lib/api/actor-location";
import { ok, fail } from "@/lib/api/response";
import { acceptTransferSchema, flagTransferSchema } from "@/lib/validation/stock";
import { DomainError, acceptTransfer, flagTransfer } from "@/lib/domain/stock";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/stock-movements/:id/accept  — phase 2 of a 2-phase transfer
 * (ADR-39). `:id` is the pending dispatch (`-q`) row.
 *
 *   - No body / `{}`              → accept: writes the `+q` counterpart at
 *                                   the destination at the dispatched
 *                                   magnitude.
 *   - `{ receivedQuantity }`      → accept an adjusted amount: the `+q`
 *                                   lands at what actually arrived, with a
 *                                   variance note (Canteen receive flow).
 *   - `{ flag: true, note }`      → LEGACY. Flag a discrepancy: records the
 *                                   note on the pending row, releases no
 *                                   stock. Retained for callers that still
 *                                   use it; the current UI does not.
 *
 * Roles: `store_manager` / `canteen_attendant` (the receiver), scoped to
 * the transfer's destination location; `admin` may act on any.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRoleIn([
    "admin",
    "store_manager",
    "canteen_attendant",
  ]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  // Body is optional; tolerate an empty/absent body.
  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  const isFlag =
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).flag === true;

  // Destination-location scoping for the location-bound roles.
  if (auth.user.role !== "admin") {
    const actorLocationId = await resolveActorLocationId(auth.user.id);
    if (!actorLocationId) {
      return fail("FORBIDDEN", "Your account is not assigned to a location.");
    }
    const dispatch = await prisma.stockMovement.findUnique({
      where: { id },
      select: { transferCounterpartLocationId: true, movementType: true },
    });
    if (!dispatch || dispatch.movementType !== "transfer") {
      return fail("NOT_FOUND", "Transfer not found.", "id");
    }
    if (dispatch.transferCounterpartLocationId !== actorLocationId) {
      return fail(
        "FORBIDDEN",
        "Only the receiving location can accept or flag this transfer.",
      );
    }
  }

  try {
    if (isFlag) {
      const parsed = flagTransferSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
      }
      const r = await flagTransfer({
        movementId: id,
        note: parsed.data.note,
        recordedById: auth.user.id,
      });
      return ok(r);
    }

    const parsed = acceptTransferSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
    }
    const r = await acceptTransfer({
      movementId: id,
      receivedQuantity: parsed.data?.receivedQuantity,
      recordedById: auth.user.id,
    });
    return ok(r, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
