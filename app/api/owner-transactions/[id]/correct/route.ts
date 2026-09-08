import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctOwnerTransactionSchema } from "@/lib/validation/financials";
import { DomainError, correctOwnerTransaction } from "@/lib/domain/financials";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/owner-transactions/:id/correct` (ADR-72). Admin-only,
 * append-only: the domain writes a linked delta `OwnerTransaction` row
 * (signed `(type, amount)` delta) plus the paired cash `MoneyMovement`.
 * Not day-close gated. `id` must be an original row, never a correction.
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

  const parsed = correctOwnerTransactionSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const txn = await correctOwnerTransaction(
      {
        ownerTransactionId: id,
        type: parsed.data.type,
        amount: parsed.data.amount,
        note: parsed.data.note,
      },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(txn, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
