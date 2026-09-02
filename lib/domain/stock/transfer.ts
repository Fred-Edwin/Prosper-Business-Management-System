import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  AcceptTransferInput,
  FlagTransferInput,
  RecordTransferInput,
  StockMovementView,
} from "./types";
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
 * Validate + write one dispatch-side (`-q`) `transfer` row on `tx` at
 * `fromLocationId`, carrying `toLocationId` in
 * `transferCounterpartLocationId`. Phase 2 (`acceptTransfer`) is
 * unchanged and out of scope for the batch (3-DOMAIN handoff §3.1). No
 * over-stock block here — the batch caller runs that up front (§3.8).
 */
async function transferDispatchLineCore(
  tx: Tx,
  line: {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    magnitude: Prisma.Decimal;
    recordedById: string;
  },
  audit: LineAuditMeta,
) {
  await assertProductExists(tx, line.productId);
  return writeMovementLine(
    tx,
    {
      productId: line.productId,
      locationId: line.fromLocationId,
      movementType: "transfer",
      quantity: line.magnitude.negated(),
      recordedById: line.recordedById,
      occurredAt: new Date(),
      transferCounterpartLocationId: line.toLocationId,
      note: "Transfer dispatched — awaiting receipt",
    },
    audit,
  );
}

/**
 * 2-phase stock transfer between two locations (ADR-39).
 *
 * A transfer is **two `transfer` rows**, each signed from its own
 * location's perspective and each carrying the other's location in
 * `transferCounterpartLocationId`:
 *
 *   Phase 1 — `recordTransfer` (Store Manager / Attendant, scoped to
 *   `fromLocationId`): writes the `-q` row at `from` immediately. Stock
 *   leaves `from` now. The `+q` counterpart does **not** exist yet — the
 *   transfer is "in transit". A pending transfer is recognisable as a
 *   `transfer` row with `quantity < 0` and no sibling `+q` row whose
 *   `correctsMovementId` points back... — see below for how the sibling
 *   is linked.
 *
 *   Phase 2 — `acceptTransfer` (receiver, scoped to `toLocationId`):
 *   writes the `+q` row at `to`. Stock lands at `to` now. The two rows are
 *   linked via the `+q` row's `correctsMovementId` = the `-q` row's id.
 *   (`correctsMovementId` is reused as a generic "this row completes that
 *   row" pointer here — these are the same movement type, same product,
 *   and the pair nets to zero across the two locations, which is exactly
 *   the correction-link invariant. ADR-39 documents this reuse.)
 *
 *   Flag — `flagTransfer` (receiver): records a discrepancy `note` on the
 *   pending `-q` row without releasing stock at `to`. The transfer stays
 *   pending; an Admin resolves it (accept, or correct the `-q` row via
 *   `correctMovement`).
 *
 * Derived balance at `from` moves on Phase 1; at `to`, only on Phase 2.
 * Nothing is double-counted and nothing is lost.
 */
export async function recordTransfer(
  input: RecordTransferInput,
): Promise<StockMovementView> {
  const qty = toMagnitude(input.quantity);

  if (input.fromLocationId === input.toLocationId) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "A transfer needs two different locations.",
      "toLocationId",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    await assertLocationExists(tx, input.fromLocationId, "fromLocationId");
    await assertLocationExists(tx, input.toLocationId, "toLocationId");

    return transferDispatchLineCore(
      tx,
      {
        productId: input.productId,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        magnitude: qty,
        recordedById: input.recordedById,
      },
      { actorId: input.recordedById, action: "transfer" },
    );
  });

  return toMovementView(row);
}

// ── Batch (dispatch side only) ──────────────────────────────────────────

export type RecordTransferBatchInput = {
  fromLocationId: string;
  toLocationId: string;
  lines: Array<{ productId: string; quantity: string }>;
  recordedById: string;
};

/**
 * Record a multi-line transfer **dispatch** in one atomic transaction
 * (3-DOMAIN handoff §3.1). Writes the N dispatch-side (`-q`) rows now;
 * `acceptTransfer` / `flagTransfer` stay single-transfer and out of
 * scope. The whole batch is **rejected — nothing written**
 * (`VALIDATION_ERROR`, field `"lines"`) if any line would drive its
 * product's derived `from` balance negative (§3.8 parity). Empty `lines`,
 * duplicate `productId`, or `from === to` also reject. One `AuditLog`
 * row per line, shared `correlationId`.
 */
export async function recordTransferBatch(
  input: RecordTransferBatchInput,
): Promise<StockMovementView[]> {
  const magnitudes = parseBatchLines(input.lines);

  if (input.fromLocationId === input.toLocationId) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "A transfer needs two different locations.",
      "toLocationId",
    );
  }
  const correlationId = newCorrelationId();

  const rows = await prisma.$transaction(async (tx) => {
    await assertLocationExists(tx, input.fromLocationId, "fromLocationId");
    await assertLocationExists(tx, input.toLocationId, "toLocationId");

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
        input.fromLocationId,
        magnitudes[i],
        product?.name ?? "Product",
      );
    }

    // Phase 2: write.
    const written = [];
    for (let i = 0; i < input.lines.length; i++) {
      written.push(
        await transferDispatchLineCore(
          tx,
          {
            productId: input.lines[i].productId,
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            magnitude: magnitudes[i],
            recordedById: input.recordedById,
          },
          {
            actorId: input.recordedById,
            correlationId,
            action: "transfer_batch",
          },
        ),
      );
    }
    return written;
  });

  return rows.map(toMovementView);
}

/** Is this row a pending (dispatched, not yet accepted) transfer? */
function isPendingDispatch(row: {
  movementType: string;
  quantity: { isNegative(): boolean };
  correctsMovementId: string | null;
}): boolean {
  return (
    row.movementType === "transfer" &&
    row.quantity.isNegative() &&
    row.correctsMovementId === null
  );
}

/**
 * Phase 2: the receiver accepts an in-transit transfer. Writes the `+q`
 * counterpart row at the destination and links it to the pending `-q` row.
 *
 * `input.receivedQuantity` (unsigned magnitude, optional) is what actually
 * arrived. Omitted ⇒ the `+q` is the exact negation of the dispatch (the
 * plain accept).
 *
 * Given and different ⇒ the transfer is booked in TWO rows at the
 * destination (owner decision 2026-09-02, F6): the `+q` lands at the FULL
 * dispatched magnitude, and a `variance` row immediately writes the
 * difference off. Net effect on the destination's balance is what actually
 * arrived, exactly as before.
 *
 * Why it is shaped this way. Every balance is a plain signed sum of the
 * rows AT a location (`derived-balance.ts`), so any row written anywhere
 * moves that location's balance. Both balances were already correct — the
 * source dropped by the full dispatched magnitude at phase 1, the
 * destination rose by what arrived — which leaves nowhere to "add" a loss
 * row without corrupting one of them. So the write-off has to be paired
 * with the receipt it offsets, at the destination: goods are treated as
 * having arrived and then been written off on receipt.
 *
 * What that buys: the missing units used to exist ONLY as free text on the
 * accept note ("Received 4, dispatched 6"), so system-wide stock silently
 * dropped with no column able to explain it. Now the loss is an ordinary
 * signed movement that sums like any other, and a daily reconciliation can
 * see where the stock went.
 *
 * The variance row is signed to cancel the discrepancy: a shortfall is
 * negative, an overage positive. It carries `transferCounterpartLocationId`
 * so the pair stays traceable, and is NOT linked by `correctsMovementId`
 * (that link is what marks a dispatch accepted, and only the `+q` row may
 * claim it).
 *
 * `deriveIncomingTransfers` keys "accepted" off the presence of a linked
 * `+q` row (`correctsMovementId`), never quantity equality, so a variance
 * accept clears the pending banner exactly like a matching one.
 *
 * `CONFLICT` if the row is not a pending dispatch (already accepted, or
 * not a dispatch row at all). `VALIDATION_ERROR` on a non-positive
 * `receivedQuantity`.
 */
export async function acceptTransfer(
  input: AcceptTransferInput,
): Promise<StockMovementView> {
  const received =
    input.receivedQuantity != null && input.receivedQuantity !== ""
      ? toMagnitude(input.receivedQuantity, "receivedQuantity")
      : null;

  const row = await prisma.$transaction(async (tx) => {
    const dispatch = await tx.stockMovement.findUnique({
      where: { id: input.movementId },
    });
    if (!dispatch || dispatch.movementType !== "transfer") {
      throw new DomainError("NOT_FOUND", "Transfer not found.", "movementId");
    }
    if (!isPendingDispatch(dispatch)) {
      throw new DomainError(
        "CONFLICT",
        "This transfer has already been accepted or is not awaiting receipt.",
      );
    }

    const alreadyAccepted = await tx.stockMovement.findFirst({
      where: { correctsMovementId: dispatch.id, movementType: "transfer" },
      select: { id: true },
    });
    if (alreadyAccepted) {
      throw new DomainError(
        "CONFLICT",
        "This transfer has already been accepted.",
      );
    }

    const toLocationId = dispatch.transferCounterpartLocationId;
    if (!toLocationId) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Pending transfer is missing its destination location.",
      );
    }

    const dispatched = dispatch.quantity.negated(); // -(-q) = +q, the sent magnitude
    const landed = received ?? dispatched;
    const hasVariance = !landed.equals(dispatched);
    const occurredAt = new Date();

    const accepted = await tx.stockMovement.create({
      data: {
        productId: dispatch.productId,
        locationId: toLocationId,
        movementType: "transfer",
        // On a variance the receipt is booked at the full dispatched amount
        // and the difference is written off by the `variance` row below, so
        // the destination still nets exactly what arrived.
        quantity: hasVariance ? dispatched : landed,
        recordedById: input.recordedById,
        occurredAt,
        transferCounterpartLocationId: dispatch.locationId,
        correctsMovementId: dispatch.id,
        note: hasVariance
          ? `Received ${landed.toString()}, dispatched ${dispatched.toString()}`
          : "Transfer received",
      },
    });

    if (hasVariance) {
      // `landed - dispatched`: negative for a shortfall (stock lost in
      // transit), positive for an overage. Paired with the receipt above,
      // so the destination's balance is unchanged from the old behaviour
      // while the loss becomes a row a total can sum.
      const delta = landed.minus(dispatched);
      await tx.stockMovement.create({
        data: {
          productId: dispatch.productId,
          locationId: toLocationId,
          movementType: "variance",
          quantity: delta,
          recordedById: input.recordedById,
          occurredAt,
          transferCounterpartLocationId: dispatch.locationId,
          note: `Transfer variance: received ${landed.toString()} of ${dispatched.toString()} dispatched`,
        },
      });
    }

    return accepted;
  });

  return toMovementView(row);
}

/**
 * The receiver flags a discrepancy on an in-transit transfer. Records the
 * note on the pending `-q` row; stock is **not** released at the
 * destination. The transfer stays pending for an Admin to resolve.
 */
export async function flagTransfer(
  input: FlagTransferInput,
): Promise<StockMovementView> {
  const note = input.note.trim();
  if (note.length === 0) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Describe the discrepancy.",
      "note",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const dispatch = await tx.stockMovement.findUnique({
      where: { id: input.movementId },
    });
    if (!dispatch || dispatch.movementType !== "transfer") {
      throw new DomainError("NOT_FOUND", "Transfer not found.", "movementId");
    }
    if (!isPendingDispatch(dispatch)) {
      throw new DomainError(
        "CONFLICT",
        "This transfer is not awaiting receipt.",
      );
    }

    return tx.stockMovement.update({
      where: { id: dispatch.id },
      data: { note: `Discrepancy flagged: ${note}` },
    });
  });

  return toMovementView(row);
}
