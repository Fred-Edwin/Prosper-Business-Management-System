import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "@/lib/domain/financials";
import { DomainError } from "./errors";
import { moneyString } from "./internal";
import type {
  CorrectRepaymentInput,
  CustomerContext,
  MoneyAccount,
  Repayment,
} from "./types";

type Tx = Prisma.TransactionClient;

const ACCOUNTS = new Set<MoneyAccount>(["cash", "mpesa_bank"]);

const ACCOUNT_DISPLAY: Record<MoneyAccount, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

function toView(row: {
  id: string;
  customerId: string;
  amount: Prisma.Decimal;
  account: MoneyAccount;
  occurredAt: Date;
  createdAt: Date;
}): Repayment {
  return {
    id: row.id,
    customerId: row.customerId,
    amount: moneyString(row.amount),
    account: row.account,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Load the original `Repayment` row and run the shared guards:
 *  - it exists;
 *  - it is not itself a correction (corrections don't chain — ADR-15).
 * Admin-only is enforced by the caller before this runs.
 */
async function loadCorrectable(tx: Tx, id: string) {
  const original = await tx.repayment.findUnique({ where: { id } });
  if (!original) {
    throw new DomainError("NOT_FOUND", "Repayment not found.", "repaymentId");
  }
  if (original.correctsRepaymentId !== null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This row is itself a correction. Correct the original repayment instead.",
      "repaymentId",
    );
  }
  return original;
}

/**
 * The repayment's current derived amount = original + Σ correction deltas.
 * Each correction is a signed `Repayment` row (positive tops the repayment
 * up, negative walks it back), so a plain sum is the current value — the
 * same shape `getCustomerLedger` / `listCustomers` already sum blindly.
 */
async function currentDerivedAmount(
  tx: Tx,
  originalId: string,
  originalAmount: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const deltas = await tx.repayment.aggregate({
    _sum: { amount: true },
    where: { correctsRepaymentId: originalId },
  });
  return originalAmount.add(deltas._sum.amount ?? 0);
}

/**
 * Correct a customer debt repayment (ADR-19 / ADR-72). **Admin only** —
 * enforced at the route, re-asserted here. **Not** day-close gated (an
 * Admin correction row may always be written).
 *
 * `input` carries the corrected FINAL `amount` (+ optional `account` /
 * `note`). In one transaction:
 *   1. load + guard the original (`loadCorrectable`);
 *   2. compute the signed delta vs. the row's current derived amount
 *      (original + Σ prior deltas); a zero delta with an unchanged account
 *      is rejected (`VALIDATION_ERROR`, idempotent — M1 F-1);
 *   3. write ONE correction `Repayment` (`correctsRepaymentId` set,
 *      `amount` = the signed delta, same `occurredAt`, the corrected
 *      account);
 *   4. write the paired `MoneyMovement` delta(s) (`sourceType: "repayment"`
 *      — a repayment is money IN, so `+delta` when the repayment grows,
 *      `−delta` when it shrinks; an account change refunds the old account
 *      by the full derived amount and debits the new one by the full
 *      corrected amount);
 *   5. `AuditLog` `action: "correct"` with `oldValue` / `newValue` sharing
 *      scalar keys so `/admin/audit-trail` renders a real was→now table.
 *
 * **Balance sign.** A repayment reducing / voiding is impossible to push
 * the customer's derived balance *further* negative than a fresh
 * overpayment already can (it moves the balance UP). A correction that
 * *increases* a repayment can drive the balance negative — but that is
 * identical to what `recordRepayment` deliberately permits for an
 * overpayment (credit in hand; see `record-repayment.ts` / ADR-19). So a
 * negative balance is **allowed here, not blocked or warned** — same rule
 * as overpayment. Flagged to the owner in the PR note; if they want
 * overpayment (and this) blocked, that is a separate follow-up.
 */
export async function correctRepayment(
  input: CorrectRepaymentInput,
  actor: CustomerContext,
): Promise<Repayment> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct a repayment.",
    );
  }

  let correctedAmount: Prisma.Decimal;
  try {
    correctedAmount = new Prisma.Decimal(input.amount);
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Amount must be a number.", "amount");
  }
  if (
    !correctedAmount.isFinite() ||
    correctedAmount.isZero() ||
    correctedAmount.isNegative()
  ) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Corrected repayment amount must be greater than zero.",
      "amount",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, input.repaymentId);

    const prevAccount = original.account;
    const newAccount = input.account ?? prevAccount;
    if (!ACCOUNTS.has(newAccount)) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Account must be cash or mpesa_bank.",
        "account",
      );
    }

    const derivedAmount = await currentDerivedAmount(
      tx,
      original.id,
      original.amount,
    );
    const delta = correctedAmount.sub(derivedAmount);

    if (delta.isZero() && prevAccount === newAccount) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected repayment is the same as the current one.",
        "amount",
      );
    }

    const note =
      input.note !== undefined
        ? input.note.trim()
          ? input.note.trim()
          : null
        : original.note;

    const correction = await tx.repayment.create({
      data: {
        customerId: original.customerId,
        amount: delta, // signed delta — sums with the original
        account: newAccount,
        note,
        recordedById: actor.actorId,
        occurredAt: original.occurredAt, // land in the original's business day
        correctsRepaymentId: original.id,
      },
    });

    // Paired money effect. A repayment is money IN (+amount), so a bigger
    // repayment is +delta more money in; a smaller one is −delta out.
    if (prevAccount === newAccount) {
      if (!delta.isZero()) {
        await recordMoneyMovement(
          {
            account: newAccount,
            amount: delta,
            sourceType: "repayment",
            sourceId: correction.id,
            occurredAt: original.occurredAt,
            note: note ?? undefined,
          },
          { actorId: actor.actorId, tx },
        );
      }
    } else {
      // Account changed — pull the old account's money back out, put the
      // corrected amount into the new one.
      await recordMoneyMovement(
        {
          account: prevAccount,
          amount: derivedAmount.negated(),
          sourceType: "repayment",
          sourceId: correction.id,
          occurredAt: original.occurredAt,
          note: note ?? undefined,
        },
        { actorId: actor.actorId, tx },
      );
      await recordMoneyMovement(
        {
          account: newAccount,
          amount: correctedAmount,
          sourceType: "repayment",
          sourceId: correction.id,
          occurredAt: original.occurredAt,
          note: note ?? undefined,
        },
        { actorId: actor.actorId, tx },
      );
    }

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "repayment",
        entityId: original.id,
        oldValue: {
          amount: derivedAmount.toFixed(2),
          account: ACCOUNT_DISPLAY[prevAccount],
        },
        newValue: {
          amount: correctedAmount.toFixed(2),
          account: ACCOUNT_DISPLAY[newAccount],
          correctionId: correction.id,
        },
        occurredAt: original.occurredAt,
      },
    });

    return correction;
  });

  return toView(row);
}

/**
 * Fully reverse a customer debt repayment (ADR-15 — a void is a correction
 * to zero). **Admin only.** Writes one correction `Repayment` carrying the
 * negated current derived amount, plus the paired `MoneyMovement` that
 * pulls the repayment's money effect back out of the account it landed in.
 * The customer's derived balance rises by the voided amount (they owe it
 * again).
 */
export async function voidRepayment(
  repaymentId: string,
  actor: CustomerContext,
): Promise<Repayment> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can void a repayment.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, repaymentId);
    const derivedAmount = await currentDerivedAmount(
      tx,
      original.id,
      original.amount,
    );

    if (derivedAmount.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This repayment is already voided.",
        "repaymentId",
      );
    }

    const correction = await tx.repayment.create({
      data: {
        customerId: original.customerId,
        amount: derivedAmount.negated(),
        account: original.account,
        note: original.note,
        recordedById: actor.actorId,
        occurredAt: original.occurredAt,
        correctsRepaymentId: original.id,
      },
    });

    // Money back out of the account the repayment landed in.
    await recordMoneyMovement(
      {
        account: original.account,
        amount: derivedAmount.negated(),
        sourceType: "repayment",
        sourceId: correction.id,
        occurredAt: original.occurredAt,
        note: original.note ?? undefined,
      },
      { actorId: actor.actorId, tx },
    );

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "soft_delete",
        entityType: "repayment",
        entityId: original.id,
        oldValue: {
          amount: derivedAmount.toFixed(2),
          account: ACCOUNT_DISPLAY[original.account],
        },
        newValue: { voided: true, reversalId: correction.id },
        occurredAt: original.occurredAt,
      },
    });

    return correction;
  });

  return toView(row);
}
