import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDateEndUtc, businessDateStartUtc } from "@/lib/time";
import type {
  ActorContext,
  ListMovementsFilter,
  OutstandingPurchases,
  StockMovementView,
} from "./types";
import { toMovementView } from "./internal";
import { DomainError } from "./errors";

/**
 * List stock movements, role-scoped:
 *   - `admin` -> every location.
 *   - `store_manager` / `canteen_attendant` / `cashier` -> their own
 *     location's rows (`actor.locationId`), PLUS pending inbound transfer
 *     dispatch rows addressed to their location (a `-q` `transfer` row
 *     whose `transferCounterpartLocationId` is their location) — the
 *     sender's row that `deriveIncomingTransfers` turns into the "Accept"
 *     banner (ADR-39). An actor with a location-bound role but no
 *     `locationId` set is a misconfiguration -> `FORBIDDEN`.
 *
 *     `cashier` was added Session 16 (ADR-68). The prior rule was "a
 *     cashier sells, they don't manage stock" -> `FORBIDDEN` outright.
 *     That predates the Restaurant non-sale flow: PRD §3 records non-sale
 *     consumption as "recorded by: any staff" and ADR-67 makes
 *     `non_sale_consumption` a legal outbound at the Restaurant, so the
 *     cashier who sees a dropped plate must be able to log it — exactly
 *     as the Canteen Attendant already can. The cashier is location-bound
 *     to the Restaurant like every other staff role; `/api/products` and
 *     `/api/stock-movements/balances` already allowed the role, so this
 *     only adds the movement ledger for products whose live balances the
 *     cashier could already see.
 *
 * Filters: `productId`, `locationId` (further narrows within the role
 * scope), `movementType`, `date` (a business date ->
 * `[businessDateStartUtc, businessDateEndUtc)` on `occurredAt`), or
 * `from`/`to` for an inclusive business-date *range* (the
 * /admin/financials range control — `date` still wins if both are given).
 *
 * Newest first.
 */
export async function listMovements(
  filter: ListMovementsFilter,
  actor: ActorContext,
): Promise<StockMovementView[]> {
  const where: Prisma.StockMovementWhereInput = {};

  if (actor.role === "admin") {
    if (filter.locationId) where.locationId = filter.locationId;
  } else if (
    actor.role === "store_manager" ||
    actor.role === "canteen_attendant" ||
    actor.role === "cashier"
  ) {
    if (!actor.locationId) {
      throw new DomainError(
        "FORBIDDEN",
        "Your account is not assigned to a location.",
      );
    }
    // Role scope wins. A foreign `locationId` filter can never match, so
    // short-circuit rather than issue a query that returns nothing.
    if (filter.locationId && filter.locationId !== actor.locationId) {
      return [];
    }
    if (filter.locationId) {
      // An explicit own-location filter: exact scope, no inbound widening.
      where.locationId = actor.locationId;
    } else {
      // Own-location rows, plus pending inbound transfer dispatch rows
      // addressed here (the sender's `-q` row — ADR-39 Accept banner).
      where.OR = [
        { locationId: actor.locationId },
        {
          movementType: "transfer",
          transferCounterpartLocationId: actor.locationId,
          quantity: { lt: 0 },
          correctsMovementId: null,
        },
      ];
    }
  } else {
    throw new DomainError(
      "FORBIDDEN",
      "You do not have access to stock movements.",
    );
  }

  if (filter.productId) where.productId = filter.productId;
  if (filter.movementType) where.movementType = filter.movementType;
  if (filter.date) {
    where.occurredAt = {
      gte: businessDateStartUtc(filter.date),
      lt: businessDateEndUtc(filter.date),
    };
  } else if (filter.from || filter.to) {
    where.occurredAt = {};
    if (filter.from) where.occurredAt.gte = businessDateStartUtc(filter.from);
    if (filter.to) where.occurredAt.lt = businessDateEndUtc(filter.to);
  }

  // Join the product so `productName` / `unitLabel` travel on each row.
  // Screens must not resolve names against `GET /api/products` — that read
  // excludes archived rows (and must keep doing so, for the pickers), which
  // rendered any movement of an archived product as "Unknown product" (F9).
  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: { product: { select: { name: true, unitLabel: true } } },
  });

  let views = rows.map(toMovementView);

  // Purchase-payment corrections (ADR-15): a `purchase_payment` correction
  // is a delta row (`correctsMovementId` set) carrying the signed
  // `purchaseTotalCost` / new supplier / qty / account. The Stock
  // Purchases screen shows one line per payment with the CURRENT values —
  // so fold each original's correction deltas into it and drop the
  // correction rows from the list. (Only `purchase_payment` and
  // `purchase_receipt` are folded this way; every other type's correction
  // rows still pass through, because the ledger grid derives balances by
  // summing all rows including deltas — `app/admin/stock/derive-ledger.ts`.)
  const paymentOriginalRows = rows.filter(
    (r) => r.movementType === "purchase_payment" && r.correctsMovementId === null,
  );
  if (paymentOriginalRows.length > 0) {
    const originalById = new Map(paymentOriginalRows.map((r) => [r.id, r]));
    const corrections = await prisma.stockMovement.findMany({
      where: {
        movementType: "purchase_payment",
        correctsMovementId: { in: [...originalById.keys()] },
      },
      orderBy: { createdAt: "asc" },
    });

    const correctionIds = new Set(corrections.map((c) => c.id));
    // Latest correction per original (supplier / qty / account are
    // last-write-wins); cost is the original + Σ every correction delta.
    const latestByOriginal = new Map<string, (typeof corrections)[number]>();
    const costByOriginal = new Map<string, Prisma.Decimal>();
    for (const [oid, orig] of originalById) {
      costByOriginal.set(oid, orig.purchaseTotalCost ?? new Prisma.Decimal(0));
    }
    for (const c of corrections) {
      const oid = c.correctsMovementId as string;
      latestByOriginal.set(oid, c);
      costByOriginal.set(
        oid,
        (costByOriginal.get(oid) ?? new Prisma.Decimal(0)).add(
          c.purchaseTotalCost ?? 0,
        ),
      );
    }

    views = views
      .filter(
        (v) =>
          !(v.movementType === "purchase_payment" && correctionIds.has(v.id)),
      )
      .map((v) => {
        const latest =
          v.movementType === "purchase_payment"
            ? latestByOriginal.get(v.id)
            : undefined;
        if (v.movementType === "purchase_payment" && v.correctsMovementId === null) {
          const derivedCost = costByOriginal.get(v.id) ?? new Prisma.Decimal(0);
          v = { ...v, voided: latest != null && derivedCost.isZero() };
        }
        if (!latest) return v;
        const derivedCost = costByOriginal.get(v.id);
        return {
          ...v,
          purchaseSupplier: latest.purchaseSupplier,
          purchaseOrderedQty:
            latest.purchaseOrderedQty == null
              ? null
              : latest.purchaseOrderedQty.toFixed(4),
          purchaseTotalCost:
            derivedCost == null ? v.purchaseTotalCost : derivedCost.toFixed(2),
          purchasePaidFrom:
            latest.purchasePaidFrom === "cash" ||
            latest.purchasePaidFrom === "mpesa_bank"
              ? latest.purchasePaidFrom
              : v.purchasePaidFrom,
        };
      });
  }

  // `purchase_receipt` corrections (same ADR-15 shape as payments, above,
  // added 2026-09-17 alongside `voidPurchaseReceipt`): fold each original
  // receipt's correction deltas into it, drop the correction rows, and
  // flag a fully-voided original (`quantity` folded to exactly zero) so
  // the UI can show "Voided" instead of a live-looking zero-quantity row.
  const receiptOriginalRows = rows.filter(
    (r) => r.movementType === "purchase_receipt" && r.correctsMovementId === null,
  );
  if (receiptOriginalRows.length > 0) {
    const originalById = new Map(receiptOriginalRows.map((r) => [r.id, r]));
    const corrections = await prisma.stockMovement.findMany({
      where: {
        movementType: "purchase_receipt",
        correctsMovementId: { in: [...originalById.keys()] },
      },
      orderBy: { createdAt: "asc" },
    });

    const correctionIds = new Set(corrections.map((c) => c.id));
    const qtyByOriginal = new Map<string, Prisma.Decimal>();
    for (const [oid, orig] of originalById) {
      qtyByOriginal.set(oid, orig.quantity);
    }
    for (const c of corrections) {
      const oid = c.correctsMovementId as string;
      qtyByOriginal.set(oid, (qtyByOriginal.get(oid) ?? new Prisma.Decimal(0)).add(c.quantity));
    }

    const hasCorrection = new Set(corrections.map((c) => c.correctsMovementId as string));
    views = views
      .filter(
        (v) =>
          !(v.movementType === "purchase_receipt" && correctionIds.has(v.id)),
      )
      .map((v) => {
        if (v.movementType !== "purchase_receipt" || v.correctsMovementId !== null) {
          return v;
        }
        const derivedQty = qtyByOriginal.get(v.id);
        if (derivedQty == null) return v;
        // `v.purchasePaymentId` already reflects the current row —
        // `voidPurchaseReceipt` clears it on the original in the same
        // transaction as the reversal, so no extra lookup is needed here.
        return {
          ...v,
          quantity: derivedQty.toFixed(4),
          voided: hasCorrection.has(v.id) && derivedQty.isZero(),
        };
      });
  }

  // F7-7: join each canteen derived `sale` row (a `sale` with a
  // `stockCountId`) to its `canteen_sale` MoneyMovement so the Canteen
  // hub timeline can render it as revenue-in instead of stock-out. The
  // money row's `sourceId` is the `stockCount.id` (not the movement id).
  const countIds = rows
    .filter((r) => r.movementType === "sale" && r.stockCountId != null)
    .map((r) => r.stockCountId as string);

  if (countIds.length > 0) {
    const revenueRows = await prisma.moneyMovement.findMany({
      where: { sourceType: "canteen_sale", sourceId: { in: countIds } },
      select: { sourceId: true, amount: true },
    });
    const revenueByCountId = new Map(
      revenueRows.map((m) => [m.sourceId, m.amount.toFixed(2)]),
    );
    for (let i = 0; i < rows.length; i++) {
      const countId = rows[i].stockCountId;
      if (rows[i].movementType === "sale" && countId != null) {
        views[i].derivedRevenue = revenueByCountId.get(countId) ?? null;
      }
    }
  }

  return views;
}

/**
 * Outstanding purchases for the Admin reconciliation view (PRD 4.2,
 * SCHEMA 3 "awaiting receipt" / "unmatched receipt"):
 *   - `awaitingReceipt`  - `purchase_payment` rows that no
 *     `purchase_receipt` row links back to (`purchasePaymentId`).
 *   - `unmatchedReceipts` - `purchase_receipt` rows with a null
 *     `purchasePaymentId`.
 *
 * Admin-only - enforced at the route.
 */
export async function listOutstandingPurchases(): Promise<OutstandingPurchases> {
  return listOutstandingPurchasesImpl(undefined);
}

/**
 * Staff-scoped sibling of `listOutstandingPurchases`: the same
 * "deliveries awaiting receipt" read, hard-filtered to a **list** of
 * destination locations.
 *
 * It takes a list, not one location, because receiving is by
 * **destination**, not by the receiver's home location (ADR-69). ADR-67
 * lands `ingredient` deliveries at the Store and `goods` deliveries at
 * the Restaurant (goods may not sit at the Store) — both the Store
 * Manager's responsibility — so an SM scoped to their single assigned
 * location could not even SEE a Restaurant-destined delivery they are
 * the one expected to receive. A single `string` is still accepted and
 * normalised, so single-location call sites are unchanged.
 *
 * The role → destination-locations map lives at the route
 * (`app/api/stock-movements/outstanding/route.ts`): admin → unfiltered
 * (`listOutstandingPurchases`), store_manager → [Store, Restaurant],
 * canteen_attendant → [Canteen].
 */
export async function listOutstandingPurchasesForLocation(
  locationIds: string | readonly string[],
): Promise<OutstandingPurchases> {
  const ids = typeof locationIds === "string" ? [locationIds] : [...locationIds];
  return listOutstandingPurchasesImpl(ids);
}

async function listOutstandingPurchasesImpl(
  locationIds: readonly string[] | undefined,
): Promise<OutstandingPurchases> {
  // `undefined` = no filter (the Admin's unfiltered read). An explicit
  // empty list would be a misconfigured caller, and correctly matches
  // nothing rather than silently widening to everything.
  const locationFilter = locationIds
    ? { locationId: { in: [...locationIds] } }
    : {};
  const [payments, unmatchedReceipts, linkedReceipts] = await Promise.all([
    // `correctsMovementId: null` — a correction/void row (ADR-15) is never
    // itself "awaiting receipt": it carries no order of its own, only a
    // signed delta on the original it corrects. Without this filter a
    // voided payment's own correction row lingers on this list forever,
    // since nothing will ever match a receipt to it — the same "current
    // state lives on the original" rule `listMovements` already applies
    // when folding correction deltas into the original row (see above).
    prisma.stockMovement.findMany({
      where: {
        movementType: "purchase_payment",
        correctsMovementId: null,
        ...locationFilter,
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: {
        movementType: "purchase_receipt",
        purchasePaymentId: null,
        ...locationFilter,
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: {
        movementType: "purchase_receipt",
        purchasePaymentId: { not: null },
      },
      select: { purchasePaymentId: true },
    }),
  ]);

  const linkedPaymentIds = new Set(
    linkedReceipts.map((r) => r.purchasePaymentId as string),
  );

  // A `voidPurchasePayment` / `voidPurchaseReceipt` fully reverses the row
  // via a SEPARATE correction row (never overwrites the original — ADR-15),
  // so `correctsMovementId: null` above is not enough by itself to exclude
  // a voided row: the original payment/receipt still comes back with its
  // ORIGINAL cost/quantity, looking exactly like a live one. Without this,
  // a payment the Admin just voided kept pinning the "Review & receive"
  // banner on the Store Manager / Canteen hub, and a voided receipt kept
  // showing as a real unmatched delivery. Fold in the correction deltas —
  // same maths `listMovements` already applies — per original id, and
  // drop anything that nets to zero.
  const [paymentDeltaRows, receiptDeltaRows] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["correctsMovementId"],
      where: {
        movementType: "purchase_payment",
        correctsMovementId: { in: payments.map((p) => p.id) },
      },
      _sum: { purchaseTotalCost: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["correctsMovementId"],
      where: {
        movementType: "purchase_receipt",
        correctsMovementId: { in: unmatchedReceipts.map((r) => r.id) },
      },
      _sum: { quantity: true },
    }),
  ]);
  const paymentDeltaById = new Map(
    paymentDeltaRows.map((r) => [r.correctsMovementId as string, r._sum.purchaseTotalCost ?? new Prisma.Decimal(0)]),
  );
  const receiptDeltaById = new Map(
    receiptDeltaRows.map((r) => [r.correctsMovementId as string, r._sum.quantity ?? new Prisma.Decimal(0)]),
  );

  const livePayments = payments.filter((p) => {
    const derived = (p.purchaseTotalCost ?? new Prisma.Decimal(0)).add(
      paymentDeltaById.get(p.id) ?? 0,
    );
    return !derived.isZero();
  });
  const liveUnmatchedReceipts = unmatchedReceipts.filter((r) => {
    const derived = r.quantity.add(receiptDeltaById.get(r.id) ?? 0);
    return !derived.isZero();
  });

  return {
    awaitingReceipt: livePayments
      .filter((p) => !linkedPaymentIds.has(p.id))
      .map(toMovementView),
    unmatchedReceipts: liveUnmatchedReceipts.map(toMovementView),
  };
}
