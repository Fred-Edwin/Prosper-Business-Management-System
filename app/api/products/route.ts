import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRole } from "@/lib/api/require-role";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import {
  createProductSchema,
  listProductsQuerySchema,
} from "@/lib/validation/catalog";
import {
  DomainError,
  createProduct,
  listProducts,
  type CreateProductInput,
} from "@/lib/domain/catalog";

// GET is read-only and consumed by the staff stock hooks (product picker
// in the receive / issue / production / non-sale / transfer flows and the
// mobile stock-levels views). `listProducts` strips `buyingPrice` to
// `null` for non-`admin` callers, so widening the read here does not
// expose buying price. Mutations below stay `admin`-only.
const PRODUCT_READ_ROLES: readonly Role[] = [
  "admin",
  "store_manager",
  "canteen_attendant",
];

export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(PRODUCT_READ_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listProductsQuerySchema.safeParse({
    kind: sp.get("kind") ?? undefined,
    search: sp.get("search") ?? undefined,
    includeArchived: sp.get("includeArchived") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const products = await listProducts(parsed.data, {
      role: auth.user.role,
    });
    return ok(products);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const product = await createProduct(parsed.data as CreateProductInput);
    return ok(product, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
