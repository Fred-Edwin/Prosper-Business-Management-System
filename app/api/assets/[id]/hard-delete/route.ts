import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { hardDeleteAssetSchema } from "@/lib/validation/assets";
import { DomainError, hardDeleteAsset } from "@/lib/domain/assets";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/assets/:id/hard-delete` — body `{ confirmName }` must match the
 * asset name exactly. Comes back `409 CONFLICT` if the asset has linked
 * history (ADR-23) — the frontend renders the dialog's blocked state, not a
 * toast.
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

  const parsed = hardDeleteAssetSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    await hardDeleteAsset(id, parsed.data.confirmName);
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
