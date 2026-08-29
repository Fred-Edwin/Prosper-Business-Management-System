import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
} from "@/lib/validation/customers";
import {
  DomainError,
  createCustomer,
  listCustomers,
} from "@/lib/domain/customers";

// Customers & Credit is Admin + Cashier on every verb (PRD §4.6 — "As the
// Admin or Cashier, I can record a repayment"; the list and balances carry
// no buying price / margin, so a Cashier seeing the full register is fine —
// plan §7). Nothing customer-side is per-cashier.
const CUSTOMER_ROLES: readonly Role[] = ["admin", "cashier"];

export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(CUSTOMER_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listCustomersQuerySchema.safeParse({
    search: sp.get("search") ?? undefined,
    hasBalance: sp.get("hasBalance") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await listCustomers(parsed.data));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRoleIn(CUSTOMER_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const customer = await createCustomer(parsed.data, {
      actorId: auth.user.id,
    });
    return ok(customer, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
