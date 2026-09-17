import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
} from "@/lib/validation/suppliers";
import {
  DomainError,
  createSupplier,
  listSuppliers,
} from "@/lib/domain/suppliers";

// Admin-only on every verb — the only roles that record a purchase payment
// (Stock/Financials) or an expense are Admin (see `recordPurchasePayment` /
// `recordExpense` doc comments), so only Admin ever needs the dropdown or
// the inline "+ Add supplier" affordance.

export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listSuppliersQuerySchema.safeParse({
    search: sp.get("search") ?? undefined,
    includeArchived: sp.get("includeArchived") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await listSuppliers(parsed.data));
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

  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const supplier = await createSupplier(parsed.data, {
      actorId: auth.user.id,
    });
    return ok(supplier, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
