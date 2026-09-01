import { Prisma } from "@prisma/client";
import type { NonSaleReason } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { RecordNonSaleConsumptionInput, StockMovementView } from "./types";
import { toMagnitude, toMovementView } from "./internal";
import { DomainError } from "./errors";
import { assertLocationExists, assertProductExists } from "./guards";
import {
  assertRemovalWouldNotGoNegative,
  newCorrelationId,
  parseBatchLines,
  writeMovementLine,
  type LineAuditMeta,
} from "./movement-core";

type Tx = Prisma.TransactionClient;

/**
 * `reasonNote` is required **iff** `reason === "other"` → else
 * `VALIDATION_ERROR` on `field`. Returns the trimmed note (or `null`).
 */
function resolveReasonNote(
  reason: NonSaleReason,
  reasonNote: string | null | undefined,
  field: string,
): string | null {
  const note = reasonNote?.trim() ?? "";
  if (reason === "other" && note.length === 0) {
    throw new DomainError(
      "VALIDATION_ERROR",
      'A note is required when the reason is "Other".',
      field,
    );
  }
  return reason === "other" ? note : null;
}

/**
 * Validate + write one `non_sale_consumption` line on `tx`. Single
 * `-quantity` row at `locationId`. No over-stock block here — the batch
 * caller runs that up front for every line (§3.8).
 */
async function nonSaleLineCore(
  tx: Tx,
  line: {
    productId: string;
    locationId: string;
    magnitude: Prisma.Decimal;
    reason: NonSaleReason;
    reasonNote: string | null;
    recordedById: string;
  },
  audit: LineAuditMeta,
) {
  await assertProductExists(tx, line.productId);
  await assertLocationExists(tx, line.locationId);
  return writeMovementLine(
    tx,
    {
      productId: line.productId,
      locationId: line.locationId,
      movementType: "non_sale_consumption",
      quantity: line.magnitude.negated(),
      recordedById: line.recordedById,
      occurredAt: new Date(),
      reason: line.reason,
      reasonNote: line.reasonNote,
    },
    audit,
  );
}

/**
 * Record non-sale consumption of stock (any relevant staff member,
 * location-scoped at the route). Single `-quantity` `non_sale_consumption`
 * row at `locationId`.
 *
 * `reason` is required (Zod guarantees the enum); `reasonNote` is required
 * **iff** `reason === "other"` → else `VALIDATION_ERROR` on `reasonNote`
 * (PRD §4.2, SCHEMA §3).
 */
export async function recordNonSaleConsumption(
  input: RecordNonSaleConsumptionInput,
): Promise<StockMovementView> {
  const magnitude = toMagnitude(input.quantity);
  const reasonNote = resolveReasonNote(input.reason, input.reasonNote, "reasonNote");

  const row = await prisma.$transaction((tx) =>
    nonSaleLineCore(
      tx,
      {
        productId: input.productId,
        locationId: input.locationId,
        magnitude,
        reason: input.reason,
        reasonNote,
        recordedById: input.recordedById,
      },
      { actorId: input.recordedById, action: "non_sale_consumption" },
    ),
  );
  return toMovementView(row);
}

// ── Batch ───────────────────────────────────────────────────────────────

export type RecordNonSaleConsumptionBatchInput = {
  locationId: string;
  /** One `reason` (+ `note` iff `other`) for the whole batch. */
  reason: NonSaleReason;
  note?: string | null;
  lines: Array<{ productId: string; quantity: string }>;
  recordedById: string;
};

/**
 * Record a multi-line non-sale consumption in **one atomic transaction**
 * (3-DOMAIN handoff §3.1). The whole batch is **rejected — nothing
 * written** (`VALIDATION_ERROR`, field `"lines"`) if any line would drive
 * its product's derived balance at `locationId` negative (§3.8 parity).
 * Empty `lines` / duplicate `productId` also reject. The single `reason`
 * (+ `note` iff `other`) applies to every line. One `AuditLog` row per
 * line, shared `correlationId`.
 */
export async function recordNonSaleConsumptionBatch(
  input: RecordNonSaleConsumptionBatchInput,
): Promise<StockMovementView[]> {
  const magnitudes = parseBatchLines(input.lines);
  const reasonNote = resolveReasonNote(input.reason, input.note, "note");
  const correlationId = newCorrelationId();

  const rows = await prisma.$transaction(async (tx) => {
    await assertLocationExists(tx, input.locationId);

    // Phase 1: BLOCK.
    for (let i = 0; i < input.lines.length; i++) {
      await assertProductExists(tx, input.lines[i].productId);
      const product = await tx.product.findUnique({
        where: { id: input.lines[i].productId },
        select: { name: true },
      });
      await assertRemovalWouldNotGoNegative(
        tx,
        input.lines[i].productId,
        input.locationId,
        magnitudes[i],
        product?.name ?? "Product",
      );
    }

    // Phase 2: write.
    const written = [];
    for (let i = 0; i < input.lines.length; i++) {
      written.push(
        await nonSaleLineCore(
          tx,
          {
            productId: input.lines[i].productId,
            locationId: input.locationId,
            magnitude: magnitudes[i],
            reason: input.reason,
            reasonNote,
            recordedById: input.recordedById,
          },
          {
            actorId: input.recordedById,
            correlationId,
            action: "non_sale_consumption_batch",
          },
        ),
      );
    }
    return written;
  });

  return rows.map(toMovementView);
}
