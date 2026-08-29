import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  hardDeleteProductSchema,
  updateProductSchema,
} from "@/lib/validation/catalog";
import {
  DomainError,
  archiveProduct,
  unarchiveProduct,
  getProduct,
  hardDeleteProduct,
  updateProduct,
  type UpdateProductInput,
} from "@/lib/domain/catalog";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    return ok(await getProduct(id));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await updateProduct(id, parsed.data as UpdateProductInput));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `POST /api/products/:id?mode=unarchive` — restore an archived product
 * (ADR-47 §4). Admin only. Clears `deletedAt`. Idempotent. Does not
 * reactivate `ProductLocation` rows (ADR-38). `{ data: { archived: false } }`.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (req.nextUrl.searchParams.get("mode") !== "unarchive") {
    return fail("VALIDATION_ERROR", "Unsupported mode. Use ?mode=unarchive.");
  }

  try {
    await unarchiveProduct(id);
    return ok({ archived: false });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `DELETE /api/products/:id`
 *   `?mode=archive`  → soft-delete (archive)
 *   otherwise        → hard delete; body `{ confirmName }` must match the
 *                      product name exactly, and a `409 CONFLICT` comes
 *                      back if the product has linked history.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (req.nextUrl.searchParams.get("mode") === "archive") {
    try {
      await archiveProduct(id);
      return ok({ archived: true });
    } catch (e) {
      if (e instanceof DomainError) return fail(e.code, e.message, e.field);
      throw e;
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = hardDeleteProductSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    await hardDeleteProduct(id, parsed.data.confirmName);
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
