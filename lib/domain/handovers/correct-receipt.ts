import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import {
  HANDOVER_INCLUDE,
  deriveDeclared,
  toHandoverView,
  toMoney,
} from "./internal";
import type {
  CorrectReceiptInput,
  HandoverActor,
  HandoverView,
} from "./types";

/**
 * Correct a recorded receipt (ADR-15 / CONVENTIONS §4). Admin-only —
 * enforced at the route. **Not day-close gated** — a correction must work
 * on a sealed day.
 *
 * `ReceiptOfHandover` has **no `corrects_receipt_id` self-relation**
 * (checked the schema — a genuine gap, but adding a column is a migration
 * this session was told to avoid unless unavoidable). It doesn't need
 * one: a receipt correction is a **new `ReceiptOfHandover` row** for the
 * same handover carrying the **corrected absolute figures** and a freshly
 * computed **stored variance** (`received − current derived declared`).
 * The original receipt row is never mutated — history is preserved by
 * having every receipt row on record.
 *
 * Read paths already resolve "the receipt" as the **latest** row for the
 * handover (`getReconciliation`, `HANDOVER_INCLUDE` ordered), so the
 * corrected figures take effect automatically and the superseded row
 * stays visible in the full receipt list / audit trail.
 *
 * The input is the **corrected final received** cash + M-Pesa (an
 * absolute value, not a delta — a receipt figure is a single fact, unlike
 * a ledger sum). Re-submitting the current figures unchanged →
 * `VALIDATION_ERROR` (nothing to correct).
 *
 * If the corrected receipt is short on either channel, `shortfallNote` is
 * **required** and a `HandoverShortfall` row is written against the
 * declaring staff member on the new receipt row.
 */
export async function correctReceipt(
  input: CorrectReceiptInput,
  actor: HandoverActor,
): Promise<HandoverView> {
  const cashReceived = toMoney(input.cashReceived, "cashReceived");
  const mpesaReceived = toMoney(input.mpesaReceived, "mpesaReceived");

  const handoverId = await prisma.$transaction(async (tx) => {
    const original = await tx.receiptOfHandover.findUnique({
      where: { id: input.receiptId },
      select: {
        id: true,
        handoverId: true,
        cashReceived: true,
        mpesaReceived: true,
        handover: { select: { staffId: true, occurredAt: true } },
      },
    });
    if (!original) {
      throw new DomainError("NOT_FOUND", "Receipt not found.", "receiptId");
    }

    // The latest receipt for this handover is the one in force; only it
    // may be corrected (correcting a superseded row would be ambiguous).
    const latest = await tx.receiptOfHandover.findFirst({
      where: { handoverId: original.handoverId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest && latest.id !== original.id) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This receipt has already been superseded by a later correction. Correct the current one.",
        "receiptId",
      );
    }

    if (
      cashReceived.equals(original.cashReceived) &&
      mpesaReceived.equals(original.mpesaReceived)
    ) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected figures are the same as the current ones.",
        "cashReceived",
      );
    }

    const declared = await deriveDeclared(tx, original.handoverId);
    if (!declared) {
      throw new DomainError("NOT_FOUND", "Handover not found.", "receiptId");
    }

    const cashVariance = cashReceived.sub(declared.cash);
    const mpesaVariance = mpesaReceived.sub(declared.mpesa);
    const isShort = cashVariance.isNegative() || mpesaVariance.isNegative();
    const note = input.shortfallNote?.trim();
    if (isShort && !note) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "A note is required when the corrected amount received is short of what was declared.",
        "shortfallNote",
      );
    }

    const corrected = await tx.receiptOfHandover.create({
      data: {
        handoverId: original.handoverId,
        cashReceived,
        mpesaReceived,
        cashVariance,
        mpesaVariance,
        recordedById: actor.userId,
        occurredAt: original.handover.occurredAt,
        ...(isShort && note
          ? {
              shortfalls: {
                create: { staffId: original.handover.staffId, note },
              },
            }
          : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "correct",
        entityType: "receipt_of_handover",
        entityId: original.id,
        oldValue: {
          cashReceived: original.cashReceived.toFixed(2),
          mpesaReceived: original.mpesaReceived.toFixed(2),
        },
        newValue: {
          supersededByReceiptId: corrected.id,
          cashReceived: cashReceived.toFixed(2),
          mpesaReceived: mpesaReceived.toFixed(2),
          cashVariance: cashVariance.toFixed(2),
          mpesaVariance: mpesaVariance.toFixed(2),
        },
        occurredAt: original.handover.occurredAt,
      },
    });

    return original.handoverId;
  });

  const row = await prisma.handover.findUniqueOrThrow({
    where: { id: handoverId },
    include: HANDOVER_INCLUDE,
  });
  const derived = await deriveDeclared(prisma, handoverId);
  return toHandoverView(
    row,
    derived?.cash ?? row.cashDeclared,
    derived?.mpesa ?? row.mpesaDeclared,
  );
}
