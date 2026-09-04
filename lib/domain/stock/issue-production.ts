import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  RecordKitchenIssueInput,
  RecordProductionInput,
  StockMovementView,
} from "./types";
import { toMagnitude, toMovementView } from "./internal";
import {
  assertKindAllowedAtLocation,
  assertLocationExists,
  assertLocationOfType,
  assertProductExists,
  assertProductIsDish,
} from "./guards";
import {
  assertRemovalWouldNotGoNegative,
  newCorrelationId,
  parseBatchLines,
  writeMovementLine,
  type LineAuditMeta,
} from "./movement-core";

type Tx = Prisma.TransactionClient;

// ── Per-line cores (shared by the single-line fns and their batch siblings) ──

/**
 * Validate + write one `issue` line on `tx`. Store → cooking; a single
 * `-quantity` `issue` row at the Store `locationId`. No over-stock block
 * here — the batch caller runs that up front for every line (§3.8).
 */
async function issueLineCore(
  tx: Tx,
  line: { productId: string; locationId: string; magnitude: Prisma.Decimal; recordedById: string },
  audit: LineAuditMeta,
) {
  await assertProductExists(tx, line.productId);
  await assertLocationExists(tx, line.locationId);
  // R1 (ADR-67): an issue draws down Store stock — and only the Store
  // holds ingredients, so this also pins `productId` to `kind =
  // "ingredient"` (a dish/goods can never sit at the Store to be issued).
  await assertKindAllowedAtLocation(tx, line.productId, line.locationId);
  return writeMovementLine(
    tx,
    {
      productId: line.productId,
      locationId: line.locationId,
      movementType: "issue",
      quantity: line.magnitude.negated(),
      recordedById: line.recordedById,
      occurredAt: new Date(),
    },
    audit,
  );
}

/**
 * Validate + write one `production` line on `tx`. `+quantity` `production`
 * row at the Restaurant `locationId`; the product must be `kind = "dish"`.
 */
async function productionLineCore(
  tx: Tx,
  line: { productId: string; locationId: string; magnitude: Prisma.Decimal; recordedById: string },
  audit: LineAuditMeta,
) {
  await assertProductIsDish(tx, line.productId);
  await assertLocationOfType(tx, line.locationId, "restaurant");
  // R1 (ADR-67) is already satisfied here: a dish at the Restaurant is a
  // legal kind↔location pair, and the two asserts above are stricter.
  return writeMovementLine(
    tx,
    {
      productId: line.productId,
      locationId: line.locationId,
      movementType: "production",
      quantity: line.magnitude,
      recordedById: line.recordedById,
      occurredAt: new Date(),
    },
    audit,
  );
}

// ── Single-line ─────────────────────────────────────────────────────────

/**
 * Record a kitchen issue — stock taken from the Store for cooking (Store
 * Manager only, enforced at the route). Store → cooking; the counterpart
 * is "cooking", not another stock location, so this is a single
 * `-quantity` `issue` row at the Store `locationId`.
 */
export async function recordKitchenIssue(
  input: RecordKitchenIssueInput,
): Promise<StockMovementView> {
  const magnitude = toMagnitude(input.quantity);
  const row = await prisma.$transaction((tx) =>
    issueLineCore(
      tx,
      {
        productId: input.productId,
        locationId: input.locationId,
        magnitude,
        recordedById: input.recordedById,
      },
      { actorId: input.recordedById, action: "issue" },
    ),
  );
  return toMovementView(row);
}

/**
 * Record production — a quantity of a Dish produced, added to Restaurant
 * stock (Store Manager only, enforced at the route). Single `+quantity`
 * `production` row at the Restaurant `locationId`. Guard: the product must
 * be `kind = "dish"`.
 */
export async function recordProduction(
  input: RecordProductionInput,
): Promise<StockMovementView> {
  const magnitude = toMagnitude(input.quantity);
  const row = await prisma.$transaction((tx) =>
    productionLineCore(
      tx,
      {
        productId: input.productId,
        locationId: input.locationId,
        magnitude,
        recordedById: input.recordedById,
      },
      { actorId: input.recordedById, action: "production" },
    ),
  );
  return toMovementView(row);
}

// ── Batch ───────────────────────────────────────────────────────────────

export type RecordKitchenIssueBatchInput = {
  locationId: string;
  lines: Array<{ productId: string; quantity: string }>;
  recordedById: string;
};

export type RecordProductionBatchInput = {
  locationId: string;
  lines: Array<{ productId: string; quantity: string }>;
  recordedById: string;
};

/**
 * Record a multi-line kitchen issue in **one atomic transaction**
 * (3-DOMAIN handoff §3.1). Every line is validated first; the whole batch
 * is **rejected — nothing written** (`VALIDATION_ERROR`, field `"lines"`)
 * if any line would drive its product's derived Store balance negative
 * (§3.8 parity). Empty `lines` / duplicate `productId` also reject.
 *
 * One `AuditLog` row per line, all carrying a shared `correlationId` so
 * they read as one logical action.
 */
export async function recordKitchenIssueBatch(
  input: RecordKitchenIssueBatchInput,
): Promise<StockMovementView[]> {
  const magnitudes = parseBatchLines(input.lines);
  const correlationId = newCorrelationId();

  const rows = await prisma.$transaction(async (tx) => {
    await assertLocationExists(tx, input.locationId);

    // Phase 1: BLOCK — check every line before any write.
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
        await issueLineCore(
          tx,
          {
            productId: input.lines[i].productId,
            locationId: input.locationId,
            magnitude: magnitudes[i],
            recordedById: input.recordedById,
          },
          { actorId: input.recordedById, correlationId, action: "issue_batch" },
        ),
      );
    }
    return written;
  });

  return rows.map(toMovementView);
}

/**
 * Record a multi-line production in **one atomic transaction**. Additive
 * (no over-stock block — §3.8 has no removal here), but every line's
 * product (`kind = "dish"`) and the Restaurant location are validated
 * first; empty `lines` / duplicate `productId` reject, nothing written.
 * One `AuditLog` row per line, shared `correlationId`.
 */
export async function recordProductionBatch(
  input: RecordProductionBatchInput,
): Promise<StockMovementView[]> {
  const magnitudes = parseBatchLines(input.lines);
  const correlationId = newCorrelationId();

  const rows = await prisma.$transaction(async (tx) => {
    await assertLocationOfType(tx, input.locationId, "restaurant");
    for (const line of input.lines) {
      await assertProductIsDish(tx, line.productId);
    }
    const written = [];
    for (let i = 0; i < input.lines.length; i++) {
      written.push(
        await productionLineCore(
          tx,
          {
            productId: input.lines[i].productId,
            locationId: input.locationId,
            magnitude: magnitudes[i],
            recordedById: input.recordedById,
          },
          {
            actorId: input.recordedById,
            correlationId,
            action: "production_batch",
          },
        ),
      );
    }
    return written;
  });

  return rows.map(toMovementView);
}
