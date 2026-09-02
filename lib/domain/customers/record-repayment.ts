import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "@/lib/domain/financials";
import { assertDayOpen, assertStaffDateIsToday } from "@/lib/domain/audit";
import { DomainError } from "./errors";
import { moneyString } from "./internal";
import type { CustomerContext, RecordRepaymentInput, Repayment } from "./types";

const ACCOUNTS = new Set(["cash", "mpesa_bank"]);

/**
 * Record a customer debt repayment (ADR-19). Admin or Cashier — enforced
 * at the route.
 *
 * In **one transaction**:
 *   1. create the `Repayment` row,
 *   2. append a `+amount` `MoneyMovement` (`sourceType: "repayment"`,
 *      `sourceId` = the repayment id, `account` = cash | mpesa_bank) via
 *      `recordMoneyMovement`, which also writes its own `AuditLog` row,
 *   3. write an `AuditLog` row for the repayment itself.
 * Repayment and money movement commit together or not at all.
 *
 * `amount` must be > 0. **Overpayment is allowed** — a repayment greater
 * than the outstanding balance is accepted and drives the derived balance
 * negative (credit in hand). This is a deliberate choice; see the Session
 * 3 handoff note flagged for the flow doc / QA. If the owner wants it
 * blocked, that is a follow-up flag, not a silent change here.
 *
 * `occurredAt` defaults to now. Its business day is **not** gated in M2
 * (no Day Close) — it is stamped so M3 can gate on it later.
 *
 * No correction path in M2 — a corrected repayment would be a new
 * offsetting row (ADR-15). Not built; the module is shaped for it.
 */
export async function recordRepayment(
  input: RecordRepaymentInput,
  ctx: CustomerContext,
): Promise<Repayment> {
  let amount: Prisma.Decimal;
  try {
    amount = new Prisma.Decimal(input.amount);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Amount must be a number.", "amount");
  }
  if (!amount.isFinite() || amount.isZero() || amount.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Repayment amount must be greater than zero.",
      "amount",
    );
  }

  if (!ACCOUNTS.has(input.account)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Account must be cash or mpesa_bank.",
      "account",
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new DomainError("NOT_FOUND", "Customer not found.", "customerId");
  }

  const occurredAt = input.occurredAt ?? new Date();

  const row = await prisma.$transaction(async (tx) => {
    // Staff "today only" gate (ADR-53) — a Cashier may only record a
    // repayment dated today; Admin is exempt. In addition to day-close.
    if (ctx.role) {
      assertStaffDateIsToday(occurredAt, { role: ctx.role });
    }
    // Day-close gate (ADR-52) — a repayment is a fresh money-ledger entry;
    // a sealed date needs an Admin correction, not a new row.
    await assertDayOpen(occurredAt, tx);

    const repayment = await tx.repayment.create({
      data: {
        customerId: input.customerId,
        amount,
        account: input.account,
        note: input.note?.trim() ? input.note.trim() : null,
        recordedById: ctx.actorId,
        occurredAt,
      },
    });

    await recordMoneyMovement(
      {
        account: input.account,
        amount, // positive: money in
        sourceType: "repayment",
        sourceId: repayment.id,
        occurredAt,
        note: input.note,
      },
      { actorId: ctx.actorId, tx },
    );

    await tx.auditLog.create({
      data: {
        userId: ctx.actorId,
        action: "create",
        entityType: "repayment",
        entityId: repayment.id,
        newValue: {
          customerId: input.customerId,
          amount: amount.toFixed(2),
          account: input.account,
        },
        occurredAt,
      },
    });

    return repayment;
  });

  return {
    id: row.id,
    customerId: row.customerId,
    amount: moneyString(row.amount),
    account: input.account,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
