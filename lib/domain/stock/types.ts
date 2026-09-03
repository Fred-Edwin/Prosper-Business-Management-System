import type { MovementType, NonSaleReason, Role } from "@prisma/client";

export type { MovementType, NonSaleReason } from "@prisma/client";

/**
 * Stock domain shapes. Shared by the domain functions, the Zod schemas in
 * `lib/validation/stock.ts`, and (Sessions 7–8) the frontend.
 *
 * Quantities cross this boundary as a decimal **string** (`"12.5000"`,
 * `"-3.0000"`) so they survive JSON without ever becoming a float — the
 * domain converts to/from Prisma `Decimal` internally. `StockMovement`
 * uses `Decimal(14,4)`, so at most 4 fractional digits.
 *
 * Sign convention (ADR-39): every `StockMovement.quantity` is signed from
 * the perspective of *its own* `locationId`. A positive row adds stock at
 * that location, a negative row removes it. Most operation inputs take an
 * **unsigned magnitude** and the domain applies the sign; `correctMovement`
 * is the exception (its stored delta may be either sign).
 */

// ── Actor ────────────────────────────────────────────────────────────────

export type ActorContext = {
  userId: string;
  role: Role;
  /**
   * The location this actor is scoped to, when their role is
   * location-bound (`store_manager`, `canteen_attendant`). `null` for
   * `admin` (sees every location). Sessions 7–8 populate this from the
   * session; Session 6 routes read it off the `User` row.
   */
  locationId: string | null;
};

// ── Reads ────────────────────────────────────────────────────────────────

export type DerivedBalance = {
  productId: string;
  locationId: string;
  /** Signed sum of every `StockMovement.quantity` for the pair, as a decimal string. */
  quantity: string;
  /**
   * ISO 8601 timestamp of the most recent `StockMovement.occurredAt` for
   * this (product, location) at or before the read's `asOf`, or `null`
   * when the product has no rows. Populated by `getDerivedStockBalances`
   * (the batched read behind `GET /api/stock-movements/balances`); the
   * single `getDerivedStockBalance` does not compute it (`undefined`).
   */
  lastMovementAt?: string | null;
};

export type StockMovementView = {
  id: string;
  productId: string;
  locationId: string;
  movementType: MovementType;
  /** Signed decimal string, from the perspective of `locationId`. */
  quantity: string;
  recordedById: string;
  /** ISO 8601. The business-day-relevant instant (not `createdAt`). */
  occurredAt: string;
  reason: NonSaleReason | null;
  reasonNote: string | null;
  orderId: string | null;
  stockCountId: string | null;
  transferCounterpartLocationId: string | null;
  purchasePaymentId: string | null;
  /**
   * Real purchase-payment detail (ADR-46 §3). Non-null only on
   * `movementType === "purchase_payment"` rows; `null` on every other
   * type, and `null` on legacy payment rows whose `note` didn't parse
   * during backfill.
   */
  purchaseSupplier: string | null;
  /** Ordered magnitude, 4dp decimal string. */
  purchaseOrderedQty: string | null;
  /** Total cost, 2dp decimal string (money). */
  purchaseTotalCost: string | null;
  purchasePaidFrom: "cash" | "mpesa_bank" | null;
  correctsMovementId: string | null;
  note: string | null;
  /**
   * For a canteen derived `sale` row (`movementType === "sale"` with a
   * `stockCountId`): the revenue of that derived sale — the amount of the
   * matching `canteen_sale` `MoneyMovement` (`sourceType: "canteen_sale"`,
   * `sourceId` = the `stockCountId`), a 2dp decimal string. `null` for
   * every non-canteen-sale movement, and `null` for a zero-sold count
   * (which writes no `MoneyMovement`). Populated by `listMovements`; the
   * single-write functions return `null` here.
   */
  derivedRevenue: string | null;
  /**
   * The product's name and unit, resolved on the server from the movement's
   * own `product` relation — so they are correct even for a product that has
   * since been ARCHIVED (F9, owner report 2026-09-02). Screens used to
   * resolve names by joining against `GET /api/products`, which excludes
   * soft-deleted rows, so a movement for an archived product rendered as
   * "Unknown product" with no unit. Those pickers must keep excluding
   * archived rows (`tests/integration/archived-picker-exclusion.test.ts`),
   * hence the name travels on the movement instead.
   *
   * Populated by `listMovements`; `null` from the single-write functions,
   * which have no join — callers there already know the product.
   */
  productName: string | null;
  unitLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutstandingPurchases = {
  /** `purchase_payment` rows with no `purchase_receipt` linked back to them. */
  awaitingReceipt: StockMovementView[];
  /** `purchase_receipt` rows recorded with a null `purchasePaymentId`. */
  unmatchedReceipts: StockMovementView[];
};

// ── Write inputs (one per operation) ─────────────────────────────────────

export type GetDerivedBalanceInput = {
  productId: string;
  locationId: string;
  /** Only rows with `occurredAt <= asOf` are summed. Default: now. */
  asOf?: Date;
};

export type SetOpeningStockInput = {
  productId: string;
  locationId: string;
  /** `YYYY-MM-DD` business date; the row lands at `businessDateStartUtc(businessDate)`. */
  businessDate: string;
  /** Unsigned magnitude — the opening on-hand quantity for that day. */
  quantity: string;
  recordedById: string;
};

export type RecordPurchasePaymentInput = {
  productId: string;
  locationId: string;
  supplier: string;
  /** Unsigned magnitude ordered/paid for. No stock effect (ADR-39). */
  quantity: string;
  /** Money — decimal string, `Decimal(12,2)`. */
  cost: string;
  /** Which balance the money leaves. F3 writes the `MoneyMovement`. */
  paidFromAccount: "cash" | "mpesa_bank";
  recordedById: string;
};

export type RecordPurchaseReceiptInput = {
  productId: string;
  locationId: string;
  /** Unsigned magnitude that actually arrived; stored as `+quantity`. */
  quantity: string;
  /** Optional link back to a `purchase_payment` row. Validated if given. */
  purchasePaymentId?: string | null;
  recordedById: string;
};

export type RecordKitchenIssueInput = {
  productId: string;
  /** The Store location stock leaves (Store → cooking). */
  locationId: string;
  /** Unsigned magnitude; stored as `-quantity`. */
  quantity: string;
  recordedById: string;
};

export type RecordProductionInput = {
  /** Must be a `kind = "dish"` product. */
  productId: string;
  /** The Restaurant location the produced dish stock lands at. */
  locationId: string;
  /** Unsigned magnitude; stored as `+quantity`. */
  quantity: string;
  recordedById: string;
};

export type RecordTransferInput = {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  /** Unsigned magnitude moved. */
  quantity: string;
  recordedById: string;
};

export type AcceptTransferInput = {
  /** The pending (`from`-side, `-q`) transfer row's id. */
  movementId: string;
  /**
   * What actually arrived, as an unsigned magnitude. Optional — omitted
   * means "received exactly what was dispatched" (the plain accept). When
   * present and different from the dispatched magnitude, the `+q` row is
   * written at this amount and carries a variance note; the source
   * location's ledger already dropped by the full dispatched amount at
   * phase 1, so the difference is simply stock lost/gained in transit —
   * the two ledgers stay a correct picture of what each location holds.
   */
  receivedQuantity?: string;
  recordedById: string;
};

export type FlagTransferInput = {
  movementId: string;
  /** Free-text discrepancy note recorded on the pending row. */
  note: string;
  recordedById: string;
};

export type RecordNonSaleConsumptionInput = {
  productId: string;
  locationId: string;
  /** Unsigned magnitude; stored as `-quantity`. */
  quantity: string;
  reason: NonSaleReason;
  /** Required iff `reason === "other"`. */
  reasonNote?: string | null;
  recordedById: string;
};

export type CorrectMovementInput = {
  /** The row being corrected. */
  movementId: string;
  /** The *corrected final* signed quantity of that row; domain computes the delta. */
  correctedQuantity: string;
  note?: string | null;
  recordedById: string;
};

export type ListMovementsFilter = {
  productId?: string;
  locationId?: string;
  movementType?: MovementType;
  /** `YYYY-MM-DD` business date → `[businessDateStartUtc, businessDateEndUtc)` on `occurredAt`. */
  date?: string;
  /**
   * Inclusive `YYYY-MM-DD` business-date range → `[businessDateStartUtc(from),
   * businessDateEndUtc(to))` on `occurredAt`. Use instead of `date` for a
   * multi-day span (the /admin/financials range control). Ignored when
   * `date` is also given (`date` wins).
   */
  from?: string;
  to?: string;
};
