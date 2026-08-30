import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRole } from "@/lib/api/require-role";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { listOrdersQuerySchema, orderInputSchema } from "@/lib/validation/orders";
import { DomainError, createOrder, listOrders } from "@/lib/domain/sales";

const ORDER_READ_ROLES: readonly Role[] = ["admin", "cashier"];

/**
 * `GET /api/orders` — role-scoped list. Admin sees all (optionally narrowed
 * by `?cashierId=`); a Cashier sees only their own (a foreign `cashierId`
 * filter returns `[]`). No margin / cost field in any row.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRoleIn(ORDER_READ_ROLES);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listOrdersQuerySchema.safeParse({
    cashierId: sp.get("cashierId") ?? undefined,
    date: sp.get("date") ?? undefined,
    paymentMethod: sp.get("paymentMethod") ?? undefined,
    orderType: sp.get("orderType") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const orders = await listOrders(parsed.data, {
      userId: auth.user.id,
      role: auth.user.role,
    });
    return ok(orders);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

/**
 * `POST /api/orders` — create an order. Cashier only. Writes the `Order` +
 * `OrderLine`s + one `sale` `StockMovement` per line + a `MoneyMovement`
 * (cash / M-Pesa) or a `Debt` (credit) + an `AuditLog` row, atomically.
 * §3.8: rejected (nothing written) if any line exceeds the derived
 * Restaurant balance.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole("cashier");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const order = await createOrder(
      {
        ...parsed.data,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(order, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
