import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { requireApiRoleIn } from "@/lib/api/require-role-in";
import { effectiveRole } from "@/lib/auth/roles";
import { ok, fail } from "@/lib/api/response";
import { recordRepaymentSchema } from "@/lib/validation/customers";
import { DomainError, recordRepayment } from "@/lib/domain/customers";

// Admin/Cashier (PRD §4.6), plus canteen_attendant (ADR-91 follow-up,
// 2026-09-23) — a canteen credit sale creates a Debt an attendant needs
// to be able to collect against later, the same as a Cashier does for a
// Restaurant credit order. `recordRepayment` books a plain `cash` /
// `mpesa_bank` MoneyMovement regardless of caller — canteen cash already
// shares that same global account (the stock-count revenue path books
// there too), so this introduces no new money-account model.
const CUSTOMER_ROLES: readonly Role[] = ["admin", "cashier", "canteen_attendant"];

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/customers/:id/repayments` — record a debt repayment. Admin,
 * Cashier, or Canteen Attendant. Writes a `Repayment` + a `+amount`
 * `MoneyMovement` + audit rows in one transaction. Overpayment is allowed
 * (drives the balance negative).
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
      { actorId: auth.user.id, role: effectiveRole(auth) },
    );
    return ok(repayment, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
