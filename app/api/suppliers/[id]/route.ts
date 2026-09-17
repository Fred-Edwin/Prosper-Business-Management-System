import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  DomainError,
  archiveSupplier,
  unarchiveSupplier,
} from "@/lib/domain/suppliers";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/suppliers/:id?mode=unarchive` — restore an archived supplier.
 * Admin only. Clears `deletedAt`. Idempotent. `{ data: { archived: false } }`.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (req.nextUrl.searchParams.get("mode") !== "unarchive") {
    return fail("VALIDATION_ERROR", "Unsupported mode. Use ?mode=unarchive.");
  }

  try {
    await unarchiveSupplier(id);
    return ok({ archived: false });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `DELETE /api/suppliers/:id` — archive (soft-delete) a supplier. Admin
 * only. No hard-delete path (mirrors Customer) — archive is enough to hide
 * a vendor from future dropdowns without disturbing historical rows that
 * still display its name.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    await archiveSupplier(id);
    return ok({ archived: true });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
