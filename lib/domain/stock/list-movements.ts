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
 *   - `store_manager` / `canteen_attendant` -> only their own location's
 *     rows (`actor.locationId`). An actor with a location-bound role but no
 *     `locationId` set is a misconfiguration -> `FORBIDDEN`.
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
    where.locationId = actor.locationId;
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

  return rows.map(toMovementView);
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
  const [payments, unmatchedReceipts, linkedReceipts] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { movementType: "purchase_payment" },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: { movementType: "purchase_receipt", purchasePaymentId: null },
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
