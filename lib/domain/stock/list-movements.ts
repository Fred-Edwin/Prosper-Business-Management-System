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
