import { prisma } from "@/lib/db";
import { assertDayOpen } from "@/lib/domain/audit";
import { DomainError } from "./errors";
import {
  HANDOVER_INCLUDE,
  deriveDeclared,
  toHandoverView,
  toMoney,
} from "./internal";
import type { HandoverActor, HandoverView, RecordReceiptInput } from "./types";

/**
 * The Admin records receipt of a handover (PRD §4.5). Admin-only —
 * enforced at the route.
 *
 * In **one transaction**:
 *   1. load the handover; compute its **current derived declared**
 *      figures (original + Σ correction deltas — `deriveDeclared`);
 *   2. `variance = received − declared` per channel and **store it
 *      permanently** on the `ReceiptOfHandover` row (never recomputed on
 *      read — PRD §4.5). Negative variance = shortfall.
 *   3. if either channel is short, write a `HandoverShortfall` row
 *      against the declaring staff member with the **required** note
 *      (`VALIDATION_ERROR` on `shortfallNote` if missing).
 *   4. one `AuditLog` "create" row for the receipt.
 *
 * This is a **create** path → day-close gated (ADR-52): the receipt's
 * `occurredAt` business day must be open.
 *
 * **No `MoneyMovement` is written (ADR-53).** The takings were already
 * booked to the money ledger when each sale was recorded; a handover is a
 * custody transfer, not new revenue, and `MoneyAccount` has no
 * till-vs-hand split for a transfer to move between. Session 4
 * (Financials) owns any revisit.
 *
 * `CONFLICT` if a receipt already exists for this handover — a re-record
 * is an Admin correction (`correctReceipt`), not a second primary row.
 */
export async function recordReceipt(
  input: RecordReceiptInput,
  actor: HandoverActor,
): Promise<HandoverView> {
  const cashReceived = toMoney(input.cashReceived, "cashReceived");
  const mpesaReceived = toMoney(input.mpesaReceived, "mpesaReceived");
  const occurredAt = input.occurredAt ?? new Date();

  const row = await prisma.$transaction(async (tx) => {
    const handover = await tx.handover.findUnique({
      where: { id: input.handoverId },
      select: {
        id: true,
        staffId: true,
        correctsHandoverId: true,
        occurredAt: true,
        _count: { select: { receipts: true } },
      },
    });
    if (!handover) {
      throw new DomainError("NOT_FOUND", "Handover not found.", "handoverId");
    }
    if (handover.correctsHandoverId !== null) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This handover is a correction row. Record receipt against the original.",
        "handoverId",
      );
    }
    if (handover._count.receipts > 0) {
      throw new DomainError(
        "CONFLICT",
        "Receipt already recorded for this handover. Use a correction instead.",
      );
    }

    // Day-close gate (ADR-52) — recording a receipt is a fresh entry.
    await assertDayOpen(occurredAt, tx);

    const declared = await deriveDeclared(tx, handover.id);
    // `deriveDeclared` returned non-null (the handover exists — we just
    // loaded it), but narrow for the type checker.
    if (!declared) {
      throw new DomainError("NOT_FOUND", "Handover not found.", "handoverId");
    }

    const cashVariance = cashReceived.sub(declared.cash);
    const mpesaVariance = mpesaReceived.sub(declared.mpesa);
    const isShort = cashVariance.isNegative() || mpesaVariance.isNegative();

    const note = input.shortfallNote?.trim();
    if (isShort && !note) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "A note is required when the amount received is short of what was declared.",
        "shortfallNote",
      );
    }

    const receipt = await tx.receiptOfHandover.create({
      data: {
        handoverId: handover.id,
        cashReceived,
        mpesaReceived,
        cashVariance,
        mpesaVariance,
        recordedById: actor.userId,
        occurredAt,
        ...(isShort && note
          ? {
              shortfalls: {
                create: { staffId: handover.staffId, note },
              },
            }
          : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "create",
        entityType: "receipt_of_handover",
        entityId: receipt.id,
        newValue: {
          handoverId: handover.id,
          cashReceived: cashReceived.toFixed(2),
          mpesaReceived: mpesaReceived.toFixed(2),
          cashVariance: cashVariance.toFixed(2),
          mpesaVariance: mpesaVariance.toFixed(2),
        },
        occurredAt,
      },
    });

    return tx.handover.findUniqueOrThrow({
      where: { id: handover.id },
      include: HANDOVER_INCLUDE,
    });
  });

  const declared = await deriveDeclared(prisma, row.id);
  return toHandoverView(
    row,
    declared?.cash ?? row.cashDeclared,
    declared?.mpesa ?? row.mpesaDeclared,
  );
}
