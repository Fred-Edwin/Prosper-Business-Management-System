import type { Prisma } from "@prisma/client";
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
 *   - `store_manager` / `canteen_attendant` -> their own location's rows
 *     (`actor.locationId`), PLUS pending inbound transfer dispatch rows
 *     addressed to their location (a `-q` `transfer` row whose
 *     `transferCounterpartLocationId` is their location) — the sender's
 *     row that `deriveIncomingTransfers` turns into the "Accept" banner
 *     (ADR-39). An actor with a location-bound role but no `locationId`
 *     set is a misconfiguration -> `FORBIDDEN`.
 *   - `cashier` -> no stock-movement access -> `FORBIDDEN`.
 *
 * Filters: `productId`, `locationId` (further narrows within the role
 * scope), `movementType`, `date` (a business date ->
 * `[businessDateStartUtc, businessDateEndUtc)` on `occurredAt`).
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
    actor.role === "canteen_attendant"
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
  }

  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const views = rows.map(toMovementView);

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
 * Store-Manager-scoped sibling of `listOutstandingPurchases`: the same
 * "deliveries awaiting receipt" read, hard-filtered to a single
 * `locationId` (the caller's assigned location). A Store Manager sees
 * only their location's pending deliveries so the Receive flow's "match a
 * delivery the Admin already paid for" picker is scoped correctly
 * (3-DOMAIN handoff §3.4). Admin keeps the unfiltered
 * `listOutstandingPurchases`.
 */
export async function listOutstandingPurchasesForLocation(
  locationId: string,
): Promise<OutstandingPurchases> {
  return listOutstandingPurchasesImpl(locationId);
}

async function listOutstandingPurchasesImpl(
  locationId: string | undefined,
): Promise<OutstandingPurchases> {
  const locationFilter = locationId ? { locationId } : {};
  const [payments, unmatchedReceipts, linkedReceipts] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { movementType: "purchase_payment", ...locationFilter },
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

  return {
    awaitingReceipt: payments
      .filter((p) => !linkedPaymentIds.has(p.id))
      .map(toMovementView),
    unmatchedReceipts: unmatchedReceipts.map(toMovementView),
  };
}
