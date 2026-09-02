import { Prisma } from "@prisma/client";
import type { MovementType, Role } from "@prisma/client";
import { assertDayOpen, assertStaffDateIsToday } from "@/lib/domain/audit";
import { DomainError } from "./errors";
import { toMagnitude } from "./internal";

type Tx = Prisma.TransactionClient;

/**
 * Per-line core shared by the single-line movement functions
 * (`recordKitchenIssue`, `recordProduction`, …) and their batch siblings
 * (`recordKitchenIssueBatch`, …). Factored out so the two can never
 * diverge (3-DOMAIN handoff §3.1).
 *
 * Each helper here:
 *   - runs on a caller-supplied `tx` (the caller owns the transaction —
 *     the single-line fn wraps one line, the batch fn wraps N),
 *   - writes exactly one `StockMovement` row with the type's sign
 *     convention (ADR-39),
 *   - writes exactly one `AuditLog` row for that line (ADR-25). A batch
 *     passes a shared `correlationId` so the N audit rows read as one
 *     logical action; a single-line call passes none.
 *
 * The BLOCK check (§3.8 parity — a line may not drive a location's
 * derived balance negative) is done by the *batch* function up front for
 * every line before any write; `assertLineWouldNotGoNegative` is the
 * shared predicate so the single-line path (which has always allowed the
 * write and let the ledger speak) and the batch path agree on the maths.
 */

export type LineAuditMeta = {
  actorId: string;
  /**
   * The acting user's role. When set, `writeMovementLine` enforces the
   * staff "today only" rule (ADR-53): a non-admin may not write a
   * `StockMovement` dated to any day other than today. Every stock create
   * path lands at `new Date()` today, so this is a chokepoint guard for
   * any future backdated stock path — pass it whenever the caller knows
   * the role.
   */
  actorRole?: Role;
  /** Shared across a batch's N rows; omitted for a single-line call. */
  correlationId?: string;
  /** Human label for the logical action, e.g. `"issue"`, `"issue_batch"`. */
  action: string;
};

/** Signed sum of every `StockMovement.quantity` for the pair, ON `tx`. */
export async function derivedBalanceOnTx(
  tx: Tx,
  productId: string,
  locationId: string,
): Promise<Prisma.Decimal> {
  const agg = await tx.stockMovement.aggregate({
    _sum: { quantity: true },
    where: { productId, locationId, occurredAt: { lte: new Date() } },
  });
  return agg._sum.quantity ?? new Prisma.Decimal(0);
}

/**
 * Throw `VALIDATION_ERROR` (field `"lines"`) if removing `magnitude` of
 * `productId` from `locationId` would take the derived balance below
 * zero. `available` in the message is the current derived balance.
 */
export async function assertRemovalWouldNotGoNegative(
  tx: Tx,
  productId: string,
  locationId: string,
  magnitude: Prisma.Decimal,
  productName: string,
): Promise<void> {
  const balance = await derivedBalanceOnTx(tx, productId, locationId);
  if (balance.minus(magnitude).isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `${productName}: only ${balance.toFixed(4)} available, cannot remove ${magnitude.toFixed(4)}.`,
      "lines",
    );
  }
}

/** Write one movement row + its audit row on `tx`. Returns the row. */
export async function writeMovementLine(
  tx: Tx,
  data: Prisma.StockMovementUncheckedCreateInput & { movementType: MovementType },
  audit: LineAuditMeta,
) {
  // Day-close gate (ADR-52) — a new movement on a sealed date is off-limits
  // to everyone; the Admin's route back in is `correctMovement`. `data`
  // carries an explicit `occurredAt` for every batch/backdated write; when
  // omitted the row lands now.
  const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
  // Staff "today only" gate (ADR-53) — in addition to day-close, a
  // non-admin may only write a movement dated today. Applied here at the
  // shared chokepoint; admin is exempt.
  if (audit.actorRole) {
    assertStaffDateIsToday(occurredAt, { role: audit.actorRole });
  }
  await assertDayOpen(occurredAt, tx);

  const row = await tx.stockMovement.create({ data });
  await tx.auditLog.create({
    data: {
      userId: audit.actorId,
      action: "create",
      entityType: "stock_movement",
      entityId: row.id,
      newValue: {
        action: audit.action,
        movementType: row.movementType,
        productId: row.productId,
        locationId: row.locationId,
        quantity: row.quantity.toFixed(4),
        ...(audit.correlationId ? { correlationId: audit.correlationId } : {}),
      },
      occurredAt: row.occurredAt,
    },
  });
  return row;
}

/**
 * Validate `lines` shape rules shared by every batch: non-empty, no
 * duplicate `productId` (reject — simpler and safer than summing;
 * 3-DOMAIN handoff §3.1). Returns the parsed magnitudes in line order.
 */
export function parseBatchLines(
  lines: ReadonlyArray<{ productId: string; quantity: string }>,
): Prisma.Decimal[] {
  if (lines.length === 0) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Add at least one product line.",
      "lines",
    );
  }
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.productId)) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The same product appears on more than one line. Combine them into a single line.",
        "lines",
      );
    }
    seen.add(line.productId);
  }
  return lines.map((l, i) => toMagnitude(l.quantity, `lines.${i}.quantity`));
}

/** A short correlation id stamped into each line's audit `newValue`. */
export function newCorrelationId(): string {
  return `batch_${crypto.randomUUID()}`;
}
