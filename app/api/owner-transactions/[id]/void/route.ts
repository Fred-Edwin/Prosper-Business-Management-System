import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, voidOwnerTransaction } from "@/lib/domain/financials";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/owner-transactions/:id/void` (ADR-72). No body. Fully
 * reverses an owner draw / return (a correction to zero): a reversal
 * `OwnerTransaction` row carrying the negated derived signed amount, plus
 * the paired cash `MoneyMovement` that returns the effect to zero.
 * Admin-only.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const txn = await voidOwnerTransaction(id, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(txn, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
