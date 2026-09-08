import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordMoneyMovement } from "@/lib/domain/financials";
import type {
  ActorContext,
  CorrectPurchasePaymentInput,
  StockMovementView,
} from "./types";
import { toMagnitude, toMoney, toMovementView } from "./internal";
import { DomainError } from "./errors";

type Tx = Prisma.TransactionClient;

const PAID_FROM_DISPLAY: Record<"cash" | "mpesa_bank", string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

/** "18,000.00" — grouped thousands, 2dp. Matches `purchases.ts`. */
function fmtMoney(dec: Prisma.Decimal): string {
  return dec.toNumber().toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "20" or "20.5" — trailing zeros trimmed for the human note only. */
function trimQty(dec: Prisma.Decimal): string {
  return dec.toFixed(4).replace(/\.?0+$/, "");
}

function composeNote(
  supplier: string | null,
  orderedQty: Prisma.Decimal,
  cost: Prisma.Decimal,
  unit: string,
  paidFromLabel: string,
): string {
  return supplier
    ? `Ordered ${trimQty(orderedQty)} ${unit} from ${supplier}; KES ${fmtMoney(cost)} from ${paidFromLabel}`
    : `Ordered ${trimQty(orderedQty)} ${unit}; KES ${fmtMoney(cost)} from ${paidFromLabel}`;
}

/**
 * Load the original `purchase_payment` row and run the shared guards:
 *  - it exists and is a `purchase_payment`;
 *  - it is not itself a correction (corrections don't chain — ADR-15);
 *  - no `purchase_receipt` is matched to it (a matched delivery must be
 *    unlinked or corrected first — same check as the manual SQL fix's
 *    Step B1).
 * Admin-only is enforced by the caller before this runs.
 */
async function loadCorrectablePayment(tx: Tx, movementId: string) {
  const original = await tx.stockMovement.findUnique({
    where: { id: movementId },
  });
  if (!original) {
    throw new DomainError("NOT_FOUND", "Payment not found.", "movementId");
  }
  if (original.movementType !== "purchase_payment") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "That movement is not a purchase payment.",
      "movementId",
    );
  }
  if (original.correctsMovementId !== null) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "This row is itself a correction. Correct the original payment instead.",
      "movementId",
    );
  }

  const matchedReceipt = await tx.stockMovement.findFirst({
    where: { movementType: "purchase_receipt", purchasePaymentId: original.id },
    select: { id: true },
  });
  if (matchedReceipt) {
    throw new DomainError(
      "CONFLICT",
      "A delivery is matched to this payment. Unmatch or correct the delivery first.",
      "movementId",
    );
  }

  return original;
}

/** The payment's current derived total cost = original + Σ correction deltas. */
async function currentDerivedCost(
  tx: Tx,
  originalId: string,
  originalCost: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const deltas = await tx.stockMovement.aggregate({
    _sum: { purchaseTotalCost: true },
    where: { correctsMovementId: originalId },
  });
  return originalCost.add(deltas._sum.purchaseTotalCost ?? 0);
}

/**
 * Write the paired money movement(s) for a cost change on a purchase
 * payment. When `paidFromAccount` is unchanged, one delta row on that
 * account. When it changed, two rows: refund the full previous cost on the
 * old account, debit the full new cost on the new account (nets to zero
 * when the cost didn't change).
 */
async function writeMoneyEffect(
  tx: Tx,
  args: {
    prevCost: Prisma.Decimal;
    prevAccount: "cash" | "mpesa_bank";
    newCost: Prisma.Decimal;
    newAccount: "cash" | "mpesa_bank";
    sourceId: string;
    occurredAt: Date;
    actorId: string;
  },
) {
  const { prevCost, prevAccount, newCost, newAccount, sourceId, occurredAt, actorId } =
    args;

  if (prevAccount === newAccount) {
    const delta = newCost.sub(prevCost); // +cost grew ⇒ more money out
    if (!delta.isZero()) {
      await recordMoneyMovement(
        {
          account: newAccount,
          amount: delta.negated(),
          sourceType: "purchase_payment",
          sourceId,
          occurredAt,
        },
        { actorId, tx },
      );
    }
    return;
  }

  // Account changed — reverse the old, apply the new.
  await recordMoneyMovement(
    {
      account: prevAccount,
      amount: prevCost, // money back to the old account
      sourceType: "purchase_payment",
      sourceId,
      occurredAt,
    },
    { actorId, tx },
  );
  await recordMoneyMovement(
    {
      account: newAccount,
      amount: newCost.negated(), // money out of the new account
      sourceType: "purchase_payment",
      sourceId,
      occurredAt,
    },
    { actorId, tx },
  );
}

/**
 * Correct a supplier purchase payment (ADR-15 / CONVENTIONS §4). **Admin
 * only** — enforced at the route, re-asserted here. **Not** day-close
 * gated (an Admin correction row may always be written).
 *
 * `input` carries the corrected FINAL values. In one transaction:
 *   1. load + guard the original (`loadCorrectablePayment`);
 *   2. compute the cost delta vs. the payment's current derived cost;
 *      a zero delta with unchanged supplier / qty / account is rejected;
 *   3. write ONE correction `stock_movement` (`purchase_payment`,
 *      `quantity: 0`, `correctsMovementId` set, the corrected `purchase_*`
 *      columns, `purchaseTotalCost` = the signed cost delta, a fresh human
 *      `note`);
 *   4. write the paired `MoneyMovement` delta(s) (`writeMoneyEffect`);
 *   5. reset the product's catalog `buyingPrice` to
 *      `correctedCost / correctedQty` (same rule as `recordPurchasePayment`);
 *   6. `AuditLog` `action: "correct"` with `oldValue` / `newValue` sharing
 *      scalar keys so `/admin/audit-trail` shows a real was→now table.
 */
export async function correctPurchasePayment(
  input: CorrectPurchasePaymentInput,
  actor: ActorContext,
): Promise<StockMovementView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can correct a purchase payment.",
    );
  }

  const orderedQty = toMagnitude(input.orderedQty, "orderedQty");
  const cost = toMoney(input.cost, "cost");
  const supplierTrimmed = input.supplier?.trim() ?? "";
  const supplier = supplierTrimmed.length > 0 ? supplierTrimmed : null;

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectablePayment(tx, input.movementId);

    const prevAccount =
      original.purchasePaidFrom === "mpesa_bank" ? "mpesa_bank" : "cash";
    const prevCost = original.purchaseTotalCost ?? new Prisma.Decimal(0);
    const prevSupplier = original.purchaseSupplier;
    const prevQty = original.purchaseOrderedQty ?? new Prisma.Decimal(0);

    const derivedCost = await currentDerivedCost(tx, original.id, prevCost);
    const costDelta = cost.sub(derivedCost);

    const nothingChanged =
      costDelta.isZero() &&
      prevAccount === input.paidFromAccount &&
      (prevSupplier ?? null) === (supplier ?? null) &&
      prevQty.equals(orderedQty);
    if (nothingChanged) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "The corrected payment is the same as the current one.",
        "cost",
      );
    }

    const product = await tx.product.findUnique({
      where: { id: original.productId },
      select: { unitLabel: true, buyingPrice: true },
    });
    const unit = product?.unitLabel ?? "unit";
    const paidFromLabel = PAID_FROM_DISPLAY[input.paidFromAccount];

    const correction = await tx.stockMovement.create({
      data: {
        productId: original.productId,
        locationId: original.locationId,
        movementType: "purchase_payment",
        quantity: new Prisma.Decimal(0), // no stock effect (ADR-39)
        recordedById: input.recordedById,
        occurredAt: original.occurredAt, // land in the original's business day
        purchaseSupplier: supplier,
        purchaseOrderedQty: orderedQty,
        purchaseTotalCost: costDelta, // signed delta — sums with the original
        purchasePaidFrom: input.paidFromAccount,
        correctsMovementId: original.id,
        note: composeNote(supplier, orderedQty, cost, unit, paidFromLabel),
      },
    });

    await writeMoneyEffect(tx, {
      prevCost: derivedCost,
      prevAccount,
      newCost: cost,
      newAccount: input.paidFromAccount,
      sourceId: correction.id,
      occurredAt: original.occurredAt,
      actorId: input.recordedById,
    });

    // Catalog buying price follows the most recent (corrected) purchase.
    await tx.product.update({
      where: { id: original.productId },
      data: { buyingPrice: cost.div(orderedQty) },
    });

    await tx.auditLog.create({
      data: {
        userId: input.recordedById,
        action: "correct",
        entityType: "stock_movement",
        entityId: original.id,
        oldValue: {
          purchaseSupplier: prevSupplier ?? "—",
          purchaseOrderedQty: prevQty.toFixed(4),
          purchaseTotalCost: derivedCost.toFixed(2),
          purchasePaidFrom: PAID_FROM_DISPLAY[prevAccount],
        },
        newValue: {
          purchaseSupplier: supplier ?? "—",
          purchaseOrderedQty: orderedQty.toFixed(4),
          purchaseTotalCost: cost.toFixed(2),
          purchasePaidFrom: paidFromLabel,
          correctionId: correction.id,
        },
        occurredAt: original.occurredAt,
      },
    });

    return correction;
  });

  return toMovementView(row);
}

/**
 * Fully reverse a supplier purchase payment (ADR-15 — a void is a
 * correction to zero). **Admin only.** Writes a reversal `stock_movement`
 * (`purchase_payment`, `quantity: 0`, `purchaseTotalCost` = the negated
 * current derived cost, `correctsMovementId` set), refunds the full
 * derived cost to the paid-from account, and rolls the product's catalog
 * `buyingPrice` back to `purchasePriorBuyingPrice` captured on the
 * original row (left as-is when that is null — a pre-column payment).
 */
export async function voidPurchasePayment(
  movementId: string,
  actor: ActorContext,
): Promise<StockMovementView> {
  if (actor.role !== "admin") {
    throw new DomainError(
      "FORBIDDEN",
      "Only an administrator can void a purchase payment.",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const original = await loadCorrectablePayment(tx, movementId);

    const prevAccount =
      original.purchasePaidFrom === "mpesa_bank" ? "mpesa_bank" : "cash";
    const prevCost = original.purchaseTotalCost ?? new Prisma.Decimal(0);
    const derivedCost = await currentDerivedCost(tx, original.id, prevCost);

    if (derivedCost.isZero()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "This payment is already voided.",
        "movementId",
      );
    }

    const product = await tx.product.findUnique({
      where: { id: original.productId },
      select: { unitLabel: true },
    });
    const unit = product?.unitLabel ?? "unit";

    const reversal = await tx.stockMovement.create({
      data: {
        productId: original.productId,
        locationId: original.locationId,
        movementType: "purchase_payment",
        quantity: new Prisma.Decimal(0),
        recordedById: actor.userId,
        occurredAt: original.occurredAt,
        purchaseSupplier: original.purchaseSupplier,
        purchaseOrderedQty: new Prisma.Decimal(0),
        purchaseTotalCost: derivedCost.negated(),
        purchasePaidFrom: prevAccount,
        correctsMovementId: original.id,
        note: `Voided — ${composeNote(
          original.purchaseSupplier,
          original.purchaseOrderedQty ?? new Prisma.Decimal(0),
          derivedCost,
          unit,
          PAID_FROM_DISPLAY[prevAccount],
        )}`,
      },
    });

    // Money back to the account the payment left.
    await recordMoneyMovement(
      {
        account: prevAccount,
        amount: derivedCost,
        sourceType: "purchase_payment",
        sourceId: reversal.id,
        occurredAt: original.occurredAt,
      },
      { actorId: actor.userId, tx },
    );

    // Roll the catalog buying price back to what it was before this payment.
    if (original.purchasePriorBuyingPrice != null) {
      await tx.product.update({
        where: { id: original.productId },
        data: { buyingPrice: original.purchasePriorBuyingPrice },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "soft_delete",
        entityType: "stock_movement",
        entityId: original.id,
        oldValue: {
          purchaseSupplier: original.purchaseSupplier ?? "—",
          purchaseTotalCost: derivedCost.toFixed(2),
          purchasePaidFrom: PAID_FROM_DISPLAY[prevAccount],
        },
        newValue: { voided: true, reversalId: reversal.id },
        occurredAt: original.occurredAt,
      },
    });

    return reversal;
  });

  return toMovementView(row);
}
