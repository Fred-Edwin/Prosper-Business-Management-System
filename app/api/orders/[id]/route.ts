import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { orderInputSchema } from "@/lib/validation/orders";
import { DomainError, editOwnOrder } from "@/lib/domain/sales";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `PATCH /api/orders/:id` — a Cashier's true edit of their **own**,
 * same-day order. `FORBIDDEN` for another cashier's order or after the
 * order's Africa/Nairobi business day has rolled (route the user to the
 * Admin correction path). Re-validates (incl. §3.8) and rewrites the
 * lines + movements in place.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("cashier");
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
    const order = await editOwnOrder(
      id,
      {
        ...parsed.data,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(order);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
