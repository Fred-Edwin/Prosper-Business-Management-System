import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "./record-money-movement";
import { DomainError } from "./errors";
import { moneyString, toPositiveAmount } from "./internal";
import type {
  CorrectOwnerTransactionInput,
  FinancialsActor,
  OwnerTransactionType,
  OwnerTransactionView,
} from "./types";

type Tx = Prisma.TransactionClient;

const TYPE_DISPLAY: Record<OwnerTransactionType, string> = {
  draw: "Draw (money out)",
  return: "Return (money in)",
};

/**
 * The signed cash effect of one `OwnerTransaction` row: a `draw` takes
 * money OUT of `cash` (negative), a `return` puts money IN (positive) —
 * mirrors the paired `MoneyMovement.amount` sign in `recordOwnerTransaction`.
 * A correction row stores its DELTA the same way: `(type, amount)` such
 * that `signed(correction)` is the signed change it applies.
 */
function signedAmount(type: OwnerTransactionType, amount: Prisma.Decimal): Prisma.Decimal {
  return type === "draw" ? amount.negated() : amount;
}

/** Split a signed cash effect back into a `(type, positive amount)` pair. */
function splitSigned(signed: Prisma.Decimal): {
  type: OwnerTransactionType;
  amount: Prisma.Decimal;
} {
  return signed.isNegative()
    ? { type: "draw", amount: signed.negated() }
    : { type: "return", amount: signed };
}

function toView(row: {
  id: string;
  type: OwnerTransactionType;
  amount: Prisma.Decimal;
  date: Date;
  note: string | null;
}): OwnerTransactionView {
  return {
    id: row.id,
    type: row.type,
    amount: moneyString(row.amount),
    date: row.date.toISOString(),
    note: row.note,
    occurredAt: row.date.toISOString(),
  };
}

/**
 * Load the original `OwnerTransaction` and run the shared guards:
 *  - it exists;
 *  - it is not itself a correction (corrections don't chain — ADR-15).
 * Admin-only is enforced by the caller before this runs.
 */
async function loadCorrectable(tx: Tx, id: string) {
  const original = await tx.ownerTransaction.findUnique({ where: { id } });
  if (!original) {
    throw new DomainError(
      "NOT_FOUND",
      "Owner transaction not found.",
      "ownerTransactionId",
    );
  }
  if (original.correctsOwnerTransactionId !== null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This row is itself a correction. Correct the original transaction instead.",
      "ownerTransactionId",
    );
  }
  return original;
}

/** The row's current derived signed cash effect = original + Σ correction deltas. */
async function currentDerivedSigned(
  tx: Tx,
  original: { id: string; type: OwnerTransactionType; amount: Prisma.Decimal },
): Promise<Prisma.Decimal> {
  const corrections = await tx.ownerTransaction.findMany({
    where: { correctsOwnerTransactionId: original.id },
    select: { type: true, amount: true },
  });
  return corrections.reduce(
    (acc, c) => acc.add(signedAmount(c.type, c.amount)),
    signedAmount(original.type, original.amount),
  );
}

/**
 * Correct an owner draw / return (ADR-15 / ADR-72). **Admin only** —
 * enforced at the route, re-asserted here. **Not** day-close gated (an
 * Admin correction row may always be written).
 *
 * `input` carries the corrected FINAL `type` + `amount`. In one transaction:
 *   1. load + guard the original (`loadCorrectable`);
 *   2. compute the signed delta vs. the row's current derived signed
 *      amount (original + Σ prior deltas); a zero delta is rejected
 *      (`VALIDATION_ERROR`, idempotent — M1 F-1);
 *   3. write ONE correction `OwnerTransaction` (`correctsOwnerTransactionId`
 *      set, `(type, amount)` = the split signed delta, same `date`);
 *   4. write the paired `MoneyMovement` delta on `cash` (`amount` = the
 *      signed delta — a `type` flip reverses the old signed amount and
 *      applies the new one in a single delta);
 *   5. `AuditLog` `action: "correct"` with `oldValue` / `newValue` sharing
 *      scalar keys so `/admin/audit-trail` renders a real was→now table.
 */
export async function correctOwnerTransaction(
  input: CorrectOwnerTransactionInput,
  actor: FinancialsActor,
): Promise<OwnerTransactionView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct an owner transaction.",
    );
  }
  if (input.type !== "draw" && input.type !== "return") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Type must be draw or return.",
      "type",
    );
  }
  const correctedAmount = toPositiveAmount(input.amount, "amount");
  const correctedSigned = signedAmount(input.type, correctedAmount);

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, input.ownerTransactionId);
    const derivedSigned = await currentDerivedSigned(tx, original);
    const deltaSigned = correctedSigned.sub(derivedSigned);

    if (deltaSigned.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected transaction is the same as the current one.",
        "amount",
      );
    }

    const note =
      input.note !== undefined
        ? input.note.trim()
          ? input.note.trim()
          : null
        : original.note;

    const deltaRow = splitSigned(deltaSigned);
    const correction = await tx.ownerTransaction.create({
      data: {
        type: deltaRow.type,
        amount: deltaRow.amount,
        date: original.date,
        note,
        correctsOwnerTransactionId: original.id,
      },
    });

    // Paired cash delta — one signed row that both reverses the old effect
    // and applies the new one (covers a `type` flip in a single step).
    await recordMoneyMovement(
      {
        account: "cash",
        amount: deltaSigned,
        sourceType: deltaSigned.isNegative() ? "owner_draw" : "owner_return",
        sourceId: correction.id,
        occurredAt: original.date,
        note: note ?? undefined,
      },
      { actorId: actor.actorId, tx },
    );

    const prevSplit = splitSigned(derivedSigned);
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "owner_transaction",
        entityId: original.id,
        oldValue: {
          type: TYPE_DISPLAY[prevSplit.type],
          amount: prevSplit.amount.toFixed(2),
        },
        newValue: {
          type: TYPE_DISPLAY[input.type],
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
 * Fully reverse an owner draw / return (ADR-15 — a void is a correction to
 * zero). **Admin only.** Writes one correction `OwnerTransaction` carrying
 * the negated current derived signed amount, plus the paired `MoneyMovement`
 * that puts the cash effect back to zero.
 */
export async function voidOwnerTransaction(
  ownerTransactionId: string,
  actor: FinancialsActor,
): Promise<OwnerTransactionView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can void an owner transaction.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectable(tx, ownerTransactionId);
    const derivedSigned = await currentDerivedSigned(tx, original);

    if (derivedSigned.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This transaction is already voided.",
        "ownerTransactionId",
      );
    }

    const reversalSigned = derivedSigned.negated();
    const reversalRow = splitSigned(reversalSigned);
    const correction = await tx.ownerTransaction.create({
      data: {
        type: reversalRow.type,
        amount: reversalRow.amount,
        date: original.date,
        note: original.note,
        correctsOwnerTransactionId: original.id,
      },
    });

    await recordMoneyMovement(
      {
        account: "cash",
        amount: reversalSigned,
        sourceType: reversalSigned.isNegative() ? "owner_draw" : "owner_return",
        sourceId: correction.id,
        occurredAt: original.date,
        note: original.note ?? undefined,
      },
      { actorId: actor.actorId, tx },
    );

    const prevSplit = splitSigned(derivedSigned);
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "soft_delete",
        entityType: "owner_transaction",
        entityId: original.id,
        oldValue: {
          type: TYPE_DISPLAY[prevSplit.type],
          amount: prevSplit.amount.toFixed(2),
        },
        newValue: { voided: true, reversalId: correction.id },
        occurredAt: original.date,
      },
    });

    return correction;
  });

  return toView(row);
}
