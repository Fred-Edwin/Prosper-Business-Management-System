import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toBusinessDate } from "@/lib/time";
import { DomainError } from "./errors";
import type { PayAdjustmentType, PayAdjustmentView } from "./pay";
import type { StaffActor } from "./types";

type Tx = Prisma.TransactionClient;

const RATE_RE = /^\d+(\.\d{1,2})?$/;

const TYPE_DISPLAY: Record<PayAdjustmentType, string> = {
  advance: "Advance",
  deduction: "Deduction",
};

export type CorrectPayAdjustmentInput = {
  adjustmentId: string;
  /** The corrected FINAL magnitude (positive decimal string, > 0). */
  amount: string;
  /** Optional replacement note. Omit to keep the original's note. */
  note?: string;
};

/**
 * Wire view of the newly-written correction (delta) row itself — mirrors
 * what `correctRepayment` / `correctOwnerTransaction` return. `amount` is
 * the signed delta; the caller refreshes `getStaffPay` for the folded
 * figure.
 */
function toView(row: {
  id: string;
  staffId: string;
  type: PayAdjustmentType;
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
}): PayAdjustmentView {
  return {
    id: row.id,
    staffId: row.staffId,
    type: row.type,
    amount: row.amount.toFixed(2),
    originalAmount: row.amount.toFixed(2),
    corrected: false,
    date: toBusinessDate(row.date),
    note: row.note,
  };
}

/**
 * Load the original `StaffPayAdjustment` and run the shared guards:
 *  - it exists;
 *  - it is not itself a correction (corrections don't chain — ADR-15).
 * Admin-only is enforced by the caller before this runs.
 */
async function loadCorrectable(tx: Tx, id: string) {
  const original = await tx.staffPayAdjustment.findUnique({ where: { id } });
  if (!original) {
    throw new DomainError(
      "NOT_FOUND",
      "Pay adjustment not found.",
      "adjustmentId",
    );
  }
  if (original.correctsAdjustmentId !== null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This row is itself a correction. Correct the original adjustment instead.",
      "adjustmentId",
    );
  }
  return original;
}

/**
 * The adjustment's current derived magnitude = original + Σ correction
 * deltas. Every correction row keeps the original's `type` and carries a
 * signed `amount` delta (positive tops it up, negative walks it back), so
 * a plain sum is the current value — the same shape `getStaffPay` /
 * `getPayrollSummary` already sum blindly per type.
 */
async function currentDerivedAmount(
  tx: Tx,
  originalId: string,
  originalAmount: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const deltas = await tx.staffPayAdjustment.aggregate({
    _sum: { amount: true },
    where: { correctsAdjustmentId: originalId },
  });
  return originalAmount.add(deltas._sum.amount ?? 0);
}

/**
 * Correct a staff pay advance / deduction (ADR-15 / ADR-72). **Admin
 * only** — enforced at the route, re-asserted here. **Not** day-close
 * gated (an Admin correction row may always be written).
 *
 * **Unlike every other ADR-72 correction, this writes NO `MoneyMovement`.**
 * A `StaffPayAdjustment` is not a cash-ledger event — it only nets into
 * the derived pay figure at read time (`getStaffPay` / `getPayrollSummary`);
 * cash moves only when a payout is recorded (`payStaff`, via a Salaries
 * `Expense`). So the correction writes ONLY the linked delta row.
 *
 * `input` carries the corrected FINAL magnitude. In one transaction:
 *   1. load + guard the original (`loadCorrectable`);
 *   2. `delta = corrected − (original + Σ prior deltas)`; a zero delta is
 *      rejected (`VALIDATION_ERROR`, idempotent — M1 F-1);
 *   3. write ONE correction `StaffPayAdjustment` (`correctsAdjustmentId`
 *      set, same `type` / `staffId` / `date`, `amount` = the signed
 *      delta — may be negative);
 *   4. `AuditLog` `action: "correct"` with `oldValue` / `newValue`
 *      sharing scalar keys so `/admin/audit-trail` renders a real
 *      was→now table.
 *
 * The `type` is never changed by a correction — an advance stays an
 * advance. To turn an advance into a deduction, void it and record the
 * other type. (Both net OFF pay identically anyway — PRD §4.8.)
 */
export async function correctPayAdjustment(
  input: CorrectPayAdjustmentInput,
  actor: StaffActor,
): Promise<PayAdjustmentView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct a pay adjustment.",
    );
  }

  const trimmed = input.amount.trim();
  if (!RATE_RE.test(trimmed)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be a number with up to 2 decimal places.",
      "amount",
    );
  }
  const correctedAmount = new Prisma.Decimal(trimmed);
  if (correctedAmount.lessThanOrEqualTo(0)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Corrected amount must be greater than zero.",
      "amount",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, input.adjustmentId);

    const derivedAmount = await currentDerivedAmount(
      tx,
      original.id,
      original.amount,
    );
    const delta = correctedAmount.sub(derivedAmount);

    if (delta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected adjustment is the same as the current one.",
        "amount",
      );
    }

    const note =
      input.note !== undefined
        ? input.note.trim()
          ? input.note.trim()
          : null
        : original.note;

    const correction = await tx.staffPayAdjustment.create({
      data: {
        staffId: original.staffId,
        type: original.type,
        amount: delta, // signed delta — sums with the original per type
        date: original.date, // land in the original's business day
        note,
        correctsAdjustmentId: original.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "staff_pay_adjustment",
        entityId: original.id,
        oldValue: {
          type: TYPE_DISPLAY[original.type],
          amount: derivedAmount.toFixed(2),
        },
        newValue: {
          type: TYPE_DISPLAY[original.type],
          amount: correctedAmount.toFixed(2),
          correctionId: correction.id,
        },
        occurredAt: original.date,
      },
    });

    return correction;
  });

  return toView(row);
}

/**
 * Fully reverse a staff pay advance / deduction (ADR-15 — a void is a
 * correction to zero). **Admin only.** Writes one correction
 * `StaffPayAdjustment` carrying the negated current derived magnitude
 * (same `type`), so the per-type sum in `getStaffPay` nets to zero. **No
 * `MoneyMovement`** — see `correctPayAdjustment`.
 */
export async function voidPayAdjustment(
  adjustmentId: string,
  actor: StaffActor,
): Promise<PayAdjustmentView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can void a pay adjustment.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, adjustmentId);
    const derivedAmount = await currentDerivedAmount(
      tx,
      original.id,
      original.amount,
    );

    if (derivedAmount.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This adjustment is already voided.",
        "adjustmentId",
      );
    }

    const correction = await tx.staffPayAdjustment.create({
      data: {
        staffId: original.staffId,
        type: original.type,
        amount: derivedAmount.negated(),
        date: original.date,
        note: original.note,
        correctsAdjustmentId: original.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "soft_delete",
        entityType: "staff_pay_adjustment",
        entityId: original.id,
        oldValue: {
          type: TYPE_DISPLAY[original.type],
          amount: derivedAmount.toFixed(2),
        },
        newValue: { voided: true, reversalId: correction.id },
        occurredAt: original.date,
      },
    });

    return correction;
  });

  return toView(row);
}
