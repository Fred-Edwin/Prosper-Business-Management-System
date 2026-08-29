import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, restoreAsset } from "@/lib/domain/assets";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/assets/:id/restore` — mirror of `.../soft-delete` (ADR-47 §4).
 * Admin only. Clears `deletedAt`; the asset returns to the default
 * register view. Idempotent. `{ data: { softDeleted: false } }`.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    await restoreAsset(id);
    return ok({ softDeleted: false });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
