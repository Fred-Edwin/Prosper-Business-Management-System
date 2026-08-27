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
    await assertProductExists(tx, input.productId);
    await assertLocationExists(tx, input.fromLocationId, "fromLocationId");
    await assertLocationExists(tx, input.toLocationId, "toLocationId");

    return tx.stockMovement.create({
      data: {
        productId: input.productId,
        locationId: input.fromLocationId,
        movementType: "transfer",
        quantity: qty.negated(),
        recordedById: input.recordedById,
        occurredAt: new Date(),
        transferCounterpartLocationId: input.toLocationId,
        note: "Transfer dispatched — awaiting receipt",
      },
    });
  });

  return toMovementView(row);
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
 * `CONFLICT` if the row is not a pending dispatch (already accepted, or
 * not a dispatch row at all).
 */
export async function acceptTransfer(
  input: AcceptTransferInput,
): Promise<StockMovementView> {
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

    return tx.stockMovement.create({
      data: {
        productId: dispatch.productId,
        locationId: toLocationId,
        movementType: "transfer",
        quantity: dispatch.quantity.negated(), // -(-q) = +q
        recordedById: input.recordedById,
        occurredAt: new Date(),
        transferCounterpartLocationId: dispatch.locationId,
        correctsMovementId: dispatch.id,
        note: "Transfer received",
      },
    });
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
