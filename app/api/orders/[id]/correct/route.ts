import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { orderInputSchema } from "@/lib/validation/orders";
import { DomainError, correctOrder } from "@/lib/domain/sales";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/orders/:id/correct` — Admin-only append-only correction. Writes
 * a **new** `Order` (`correctsOrderId` set) with offsetting stock +
 * money / debt rows so the net effect equals the corrected state. Body is
 * the corrected final state of the order (same shape as create).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const order = await correctOrder(
      id,
      {
        ...parsed.data,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(order, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
