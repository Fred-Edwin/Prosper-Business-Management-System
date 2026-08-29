import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { DomainError, getCustomerLedger } from "@/lib/domain/customers";

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
