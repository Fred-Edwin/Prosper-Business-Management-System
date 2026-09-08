import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
import { businessDateOnly, toBusinessDate } from "@/lib/time";
import { DomainError } from "./errors";
import type { StaffActor } from "./types";

type Tx = Prisma.TransactionClient;

const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RATE_RE = /^\d+(\.\d{1,2})?$/;

const ZERO = new Prisma.Decimal(0);

/**
 * Wire view of ONE `daily_entry` staff-day, folding any ADR-72 correction
 * deltas into `amount` (mirrors `PayAdjustmentView`). A correction row is
 * never surfaced standalone. A voided entry reads `"0.00"`.
 */
export type DailyPayView = {
  id: string;
  staffId: string;
  /** Current derived amount (original + Σ correction deltas). */
  amount: string;
  /** The as-recorded amount before any correction (audit reference). */
  originalAmount: string;
  /** True once one or more correction rows point at this entry. */
  corrected: boolean;
  /** YYYY-MM-DD business date the pay is for. */
  date: string;
  note: string | null;
};

export type RecordDailyPayInput = {
  staffId: string;
  /** Positive decimal string, > 0. */
  amount: string;
  /** YYYY-MM-DD business date. */
  date: string;
  note?: string;
};

type DailyPayRow = {
  id: string;
  staffId: string;
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
  correctsDailyPayId: string | null;
};

/**
 * Collapse a set of `StaffDailyPay` rows to one view per ORIGINAL, folding
 * each correction delta into its target's `amount`. Ordered by the
 * original's date ascending. (Same shape as `toAdjustmentViews` in
 * `pay.ts`.)
 */
export function toDailyPayViews(rows: DailyPayRow[]): DailyPayView[] {
  const deltaByOriginal = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    if (r.correctsDailyPayId === null) continue;
    const acc = deltaByOriginal.get(r.correctsDailyPayId) ?? ZERO;
    deltaByOriginal.set(r.correctsDailyPayId, acc.plus(r.amount));
  }
  return rows
    .filter((r) => r.correctsDailyPayId === null)
    .map((r) => {
      const delta = deltaByOriginal.get(r.id);
      const current = delta ? r.amount.plus(delta) : r.amount;
      return {
        id: r.id,
        staffId: r.staffId,
        amount: current.toFixed(2),
        originalAmount: r.amount.toFixed(2),
        corrected: delta !== undefined,
        date: toBusinessDate(r.date),
        note: r.note,
      };
    });
}

function toView(row: {
  id: string;
  staffId: string;
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
}): DailyPayView {
  return {
    id: row.id,
    staffId: row.staffId,
    amount: row.amount.toFixed(2),
    originalAmount: row.amount.toFixed(2),
    corrected: false,
    date: toBusinessDate(row.date),
    note: row.note,
  };
}

/**
 * Load the original `StaffDailyPay` and run the shared correction guards:
 *  - it exists;
 *  - it is not itself a correction (corrections don't chain — ADR-15).
 * Admin-only is enforced by the caller before this runs.
 */
async function loadCorrectable(tx: Tx, id: string) {
  const original = await tx.staffDailyPay.findUnique({ where: { id } });
  if (!original) {
    throw new DomainError("NOT_FOUND", "Daily pay entry not found.", "dailyPayId");
  }
  if (original.correctsDailyPayId !== null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This row is itself a correction. Correct the original entry instead.",
      "dailyPayId",
    );
  }
  return original;
}

/**
 * The entry's current derived amount = original + Σ correction deltas.
 * Every correction row carries a signed `amount` delta, so a plain sum is
 * the current value (the same shape `getStaffPay` sums blindly).
 */
async function currentDerivedAmount(
  tx: Tx,
  originalId: string,
  originalAmount: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const deltas = await tx.staffDailyPay.aggregate({
    _sum: { amount: true },
    where: { correctsDailyPayId: originalId },
  });
  return originalAmount.add(deltas._sum.amount ?? 0);
}

/**
 * Record one hand-typed daily pay amount for a `daily_entry` staff member
 * (staff-pay rework PR 2, ADR-76). **Admin-only.**
 *
 * This IS an append-only create path (`StaffDailyPay` has a correction
 * self-relation but no mutable total), so per ADR-72 it is **day-close
 * gated** — `assertDayOpen(date)`. A mistake on a closed day is fixed with
 * `correctDailyPay` / `voidDailyPay` (an Admin delta row is always
 * allowed).
 *
 * The staff member must be on `payModel: "daily_entry"` — a
 * `fixed_daily_rate` staff member's pay comes from `dailyRate × days
 * present` and this call is `VALIDATION_ERROR`. At most one ORIGINAL entry
 * per (staff, date): a second one is `CONFLICT` (correct the existing
 * entry instead), enforced in code AND by the partial unique index.
 *
 * Writes NO `MoneyMovement` — a pay entry is not a cash event until a
 * payout is recorded (`payStaff`).
 */
export async function recordDailyPay(
  input: RecordDailyPayInput,
  actor: StaffActor,
): Promise<DailyPayView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can record daily pay.",
    );
  }
  if (!BUSINESS_DATE_RE.test(input.date)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Date must be a YYYY-MM-DD business date.",
      "date",
    );
  }
  const trimmedAmount = input.amount.trim();
  if (!RATE_RE.test(trimmedAmount)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be a number with up to 2 decimal places.",
      "amount",
    );
  }
  const amount = new Prisma.Decimal(trimmedAmount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Amount must be greater than zero.",
      "amount",
    );
  }
  const note = input.note?.trim() ? input.note.trim() : null;

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { id: true, payModel: true },
  });
  if (!staff) {
    throw new DomainError("NOT_FOUND", "Staff member not found.", "staffId");
  }
  if (staff.payModel !== "daily_entry") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This staff member is paid a fixed daily rate — set their pay model to daily-entry first.",
      "staffId",
    );
  }

  const dateOnly = businessDateOnly(input.date);

  const row = await prisma.$transaction(async (tx) => {
    await assertDayOpen(input.date, tx);
    let created;
    try {
      created = await tx.staffDailyPay.create({
        data: {
          staffId: input.staffId,
          amount,
          date: dateOnly,
          note,
          recordedById: actor.actorId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new DomainError(
          "CONFLICT",
          "This staff member already has a daily pay entry for that date. Correct the existing entry instead.",
          "date",
        );
      }
      throw e;
    }
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "create",
        entityType: "staff_daily_pay",
        entityId: created.id,
        newValue: { amount: amount.toFixed(2), date: input.date },
        occurredAt: dateOnly,
      },
    });
    return created;
  });

  return toView(row);
}

export type CorrectDailyPayInput = {
  dailyPayId: string;
  /** The corrected FINAL amount (positive decimal string, > 0). */
  amount: string;
  /** Optional replacement note. Omit to keep the original's note. */
  note?: string;
};

/**
 * Correct one `daily_entry` staff-day (ADR-15 / ADR-72). **Admin only** —
 * enforced at the route, re-asserted here. **Not** day-close gated (an
 * Admin correction row may always be written). Writes NO `MoneyMovement` —
 * see `recordDailyPay`.
 *
 * `input` carries the corrected FINAL amount. In one transaction:
 *   1. load + guard the original (`loadCorrectable`);
 *   2. `delta = corrected − (original + Σ prior deltas)`; a zero delta is
 *      rejected (`VALIDATION_ERROR`, idempotent — M1 F-1);
 *   3. write ONE correction `StaffDailyPay` (`correctsDailyPayId` set,
 *      same `staffId` / `date`, `amount` = the signed delta — may be
 *      negative);
 *   4. `AuditLog` `action: "correct"` with `oldValue` / `newValue`.
 */
export async function correctDailyPay(
  input: CorrectDailyPayInput,
  actor: StaffActor,
): Promise<DailyPayView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct daily pay.",
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
    const original = await loadCorrectable(tx, input.dailyPayId);

    const derivedAmount = await currentDerivedAmount(
      tx,
      original.id,
      original.amount,
    );
    const delta = correctedAmount.sub(derivedAmount);

    if (delta.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected amount is the same as the current one.",
        "amount",
      );
    }

    const note =
      input.note !== undefined
        ? input.note.trim()
          ? input.note.trim()
          : null
        : original.note;

    const correction = await tx.staffDailyPay.create({
      data: {
        staffId: original.staffId,
        amount: delta, // signed delta — sums with the original
        date: original.date, // land in the original's business day
        note,
        recordedById: actor.actorId,
        correctsDailyPayId: original.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "staff_daily_pay",
        entityId: original.id,
        oldValue: { amount: derivedAmount.toFixed(2) },
        newValue: {
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
 * Fully reverse one `daily_entry` staff-day (ADR-15 — a void is a
 * correction to zero). **Admin only.** Writes one correction
 * `StaffDailyPay` carrying the negated current derived amount, so the sum
 * in `getStaffPay` nets to zero. **No `MoneyMovement`.**
 */
export async function voidDailyPay(
  dailyPayId: string,
  actor: StaffActor,
): Promise<DailyPayView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can void daily pay.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, dailyPayId);
    const derivedAmount = await currentDerivedAmount(
      tx,
      original.id,
      original.amount,
    );

    if (derivedAmount.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This daily pay entry is already voided.",
        "dailyPayId",
      );
    }

    const correction = await tx.staffDailyPay.create({
      data: {
        staffId: original.staffId,
        amount: derivedAmount.negated(),
        date: original.date,
        note: original.note,
        recordedById: actor.actorId,
        correctsDailyPayId: original.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "soft_delete",
        entityType: "staff_daily_pay",
        entityId: original.id,
        oldValue: { amount: derivedAmount.toFixed(2) },
        newValue: { voided: true, reversalId: correction.id },
        occurredAt: original.date,
      },
    });

    return correction;
  });

  return toView(row);
}
