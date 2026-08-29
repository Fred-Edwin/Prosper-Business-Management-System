import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, softDeleteAsset } from "@/lib/domain/assets";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/assets/:id/soft-delete` — stamp `deletedAt`; the asset drops
 * out of the default register view (ADR-22 / ADR-23). Idempotent.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    await softDeleteAsset(id);
    return ok({ softDeleted: true });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
