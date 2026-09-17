import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  DomainError,
  archiveCustomer,
  getCustomerLedger,
  unarchiveCustomer,
} from "@/lib/domain/customers";

const CUSTOMER_ROLES: readonly Role[] = ["admin", "cashier"];

type Ctx = { params: Promise<{ id: string }> };

/** `GET /api/customers/:id` → the customer + their interleaved debt/repayment ledger. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRoleIn(CUSTOMER_ROLES);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    return ok(await getCustomerLedger(id));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `POST /api/customers/:id?mode=unarchive` — restore an archived customer.
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
    await unarchiveCustomer(id);
    return ok({ archived: false });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `DELETE /api/customers/:id` — archive (soft-delete) a customer. Admin
 * only. There is no hard-delete path for Customer (unlike Product/Asset):
 * FK history (Order/Debt/Repayment) makes it practically unreachable for
 * any real customer, so archive is the only removal path — no `?mode=`
 * or body needed.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    await archiveCustomer(id);
    return ok({ archived: true });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
