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

// GET (search) and POST (create/quick-create) also open to
// canteen_attendant (ADR-91) — the canteen credit-sale flow needs to find
// or quick-create a customer to attach, the same way the Cashier's C5
// sheet does. Everything else on this resource — the ledger, repayments,
// archive/unarchive — stays Admin/Cashier-only; an attendant never needs
// to view or edit a customer beyond picking one for a sale.
const CUSTOMER_LOOKUP_ROLES: readonly Role[] = ["admin", "cashier", "canteen_attendant"];

export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(CUSTOMER_LOOKUP_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listCustomersQuerySchema.safeParse({
    search: sp.get("search") ?? undefined,
    hasBalance: sp.get("hasBalance") ?? undefined,
    owingOnly: sp.get("owingOnly") ?? undefined,
    includeArchived: sp.get("includeArchived") ?? undefined,
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
  const auth = await requireApiRoleIn(CUSTOMER_LOOKUP_ROLES);
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
