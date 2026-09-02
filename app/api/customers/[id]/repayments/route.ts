import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { ok, fail } from "@/lib/api/response";
import { recordRepaymentSchema } from "@/lib/validation/customers";
import { DomainError, recordRepayment } from "@/lib/domain/customers";

const CUSTOMER_ROLES: readonly Role[] = ["admin", "cashier"];

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/customers/:id/repayments` — record a debt repayment. Admin or
 * Cashier. Writes a `Repayment` + a `+amount` `MoneyMovement` + audit rows
 * in one transaction. Overpayment is allowed (drives the balance negative).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRoleIn(CUSTOMER_ROLES);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordRepaymentSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const repayment = await recordRepayment(
      {
        customerId: id,
        amount: parsed.data.amount,
        account: parsed.data.account,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
        note: parsed.data.note,
      },
      { actorId: auth.user.id, role: auth.user.role },
    );
    return ok(repayment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
