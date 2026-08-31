import type { OrderType, PaymentMethod, MoneyAccount, Role } from "@prisma/client";

export type { OrderType, PaymentMethod, MoneyAccount } from "@prisma/client";

/**
 * Restaurant order (M2-F1) domain shapes (ADR-16). Money crosses the
 * domain boundary as decimal **strings** (`"230.00"`) — never a JS float;
 * `Prisma.Decimal` is used internally (ADR-30). Stock quantities are also
 * decimal strings on the boundary.
 *
 * `Order.total` is a stored *convenience* value recomputed on every write
 * and correction — never trusted as the source of truth. Cash / M-Pesa
 * balances stay derived (`getAccountBalances`), Restaurant stock stays
 * derived (`getDerivedStockBalance`).
 */

/**
 * Acting-user context. `role` is enforced at the route; the domain trusts
 * it.
 *
 * `restaurantId` is a **test-only seam**: production has exactly one active
 * Restaurant and the domain resolves it itself (`resolveRestaurantId`).
 * Parallel test files each stand up their own Restaurant row, so the tests
 * pass the one they built rather than depend on which row is "the"
 * restaurant globally. Route handlers never set it.
 */
export type ActorContext = {
  userId: string;
  role: Role;
  restaurantId?: string;
  /**
   * The canteen `Location` the actor is bound to (canteen slice, S5).
   * Set from `resolveActorLocationId` at the route for a
   * `canteen_attendant`; `null`/absent for an `admin` (sees every
   * canteen). A `canteen_attendant` with no `locationId` is a
   * misconfiguration the domain turns into `FORBIDDEN`.
   */
  locationId?: string | null;
};

/* ------------------------------------------------------------------ *
 * Canteen derived sales (M2-F3, S5) — ADR-16.
 *
 * The attendant never enters a sale. They record a **stock count** (what
 * is physically on the shelf) and the system derives units sold and
 * revenue for the period since that product's previous count:
 *
 *   sold = expectedRemaining − countedQuantity
 *
 * where `expectedRemaining` is the derived canteen balance for the
 * product at the count's `occurredAt` (opening + transfers + production
 * − non-sale consumption − prior sales). A stock count that would make
 * `sold` negative (counted MORE than expected) is rejected — the count
 * can be undone same-day and re-recorded instead (owner decision,
 * 2026-08-30).
 * ------------------------------------------------------------------ */

export type RecordStockCountInput = {
  productId: string;
  /** Decimal string; must be >= 0 (0 is valid — nothing sold this period). */
  countedQuantity: string;
  /** Defaults to now. Must be after the product's previous count at this canteen. */
  occurredAt?: Date;
};

/** The derived-sale figures returned alongside a fresh `StockCount`. */
export type DerivedSale = {
  /** Units sold in the period (decimal string, 4dp; always >= 0). */
  unitsSold: string;
  /** `unitsSold × canteen sellingPrice` (decimal string, 2dp). */
  revenue: string;
  /**
   * Start of the period the figure covers, ISO string — the previous
   * count's `occurredAt`, or `null` for a first-ever count ("since the
   * product's opening").
   */
  periodStart: string | null;
  /** End of the period — this count's `occurredAt`, ISO string. */
  periodEnd: string;
};

export type RecordStockCountResult = {
  count: {
    id: string;
    productId: string;
    locationId: string;
    countedById: string;
    /** Decimal string, 4dp. */
    countedQuantity: string;
    occurredAt: string;
    createdAt: string;
  };
  derivedSale: DerivedSale;
};

/** Body for the K1 preview (`GET /api/canteen/stock-counts/preview`). */
export type PreviewStockCountInput = {
  productId: string;
  /** Decimal string; must be >= 0. */
  countedRemaining: string;
  /** Defaults to now. */
  occurredAt?: Date;
};

/**
 * The dry-run derived-sale for the K1 preview card — the SAME figures
 * `recordStockCount` will persist, computed without any write.
 * `blocked: true` (counted more than the ledger expects) mirrors the
 * rejection `recordStockCount` would throw, so the screen can show the
 * blocked state without a write; `unitsSold` / `revenue` are `null` then.
 */
export type StockCountPreview = {
  blocked: boolean;
  /** Decimal string (4dp) — how far the count exceeds expected stock; `null` unless blocked. */
  exceedsExpectedBy: string | null;
  isFirstCount: boolean;
  /** ISO string — the previous count's `occurredAt`; `null` for a first count. */
  periodStart: string | null;
  /** Alias of `periodStart` (the "last counted at" for copy). */
  lastCountedAt: string | null;
  /** Whole days between the previous count and now; `null` if first. */
  daysSincePrevious: number | null;
  /** Decimal string (4dp) — echoes the input. */
  countedRemaining: string;
  /** Decimal string (4dp) or `null` when blocked. */
  unitsSold: string | null;
  /** Decimal string (2dp) or `null` when blocked. */
  revenue: string | null;
  /** Decimal string (4dp) — always the counted value. */
  closingStockWillBe: string;
};

/**
 * One product's most recent derived-sales figure (PRD §4.4 — "per
 * product, when it was last counted and what period a figure covers").
 */
export type DerivedSaleView = {
  productId: string;
  productName: string;
  /** ISO string — the latest `StockCount.occurredAt`; `null` if never counted. */
  lastCountedAt: string | null;
  /** ISO string — the previous count's `occurredAt`; `null` for a first count / never counted. */
  periodStart: string | null;
  /** ISO string — the latest count's `occurredAt`; `null` if never counted. */
  periodEnd: string | null;
  /** Decimal string (4dp) or `null` if never counted. */
  unitsSold: string | null;
  /** Decimal string (2dp) or `null` if never counted. */
  revenue: string | null;
  /** The latest `StockCount.id` or `null` if never counted. */
  stockCountId: string | null;
};

export type ListDerivedSalesFilter = {
  productId?: string;
  /** A business date (`YYYY-MM-DD`) — windows on the count's `occurredAt`. */
  date?: string;
};

export type OrderLineInput = {
  productId: string;
  /** Decimal string; must be > 0. */
  quantity: string;
};

export type CreateOrderInput = {
  orderType: OrderType;
  /** Decimal string; allowed ONLY when `orderType === "delivery"`. */
  deliveryFee?: string;
  paymentMethod: PaymentMethod;
  /** REQUIRED when `paymentMethod === "credit"`; must be absent otherwise. */
  customerId?: string;
  /**
   * Which money account a cash / M-Pesa order lands in. Optional — the
   * flow doc (`restaurant-sales-flow.md` A/B) has no explicit picker, so
   * when omitted it is **derived** from `paymentMethod` (`cash` → `cash`,
   * `mpesa` → `mpesa_bank`). If given, it must be consistent with
   * `paymentMethod` or the order is rejected.
   */
  account?: MoneyAccount;
  /** Defaults to now. Its Africa/Nairobi business day gates edit-vs-correct. */
  occurredAt?: Date;
  lines: OrderLineInput[];
};

/** Same shape as `CreateOrderInput` — an edit fully re-states the order. */
export type EditOwnOrderInput = CreateOrderInput;

/** Same shape again — a correction is the corrected *final* state of the order. */
export type CorrectOrderInput = CreateOrderInput;

export type ListOrdersFilter = {
  cashierId?: string;
  /** A business date (`YYYY-MM-DD`) — windowed on `occurredAt`. */
  date?: string;
  paymentMethod?: PaymentMethod;
  orderType?: OrderType;
};

export type OrderLineView = {
  id: string;
  productId: string;
  /** Product display name snapshotted/hydrated from Product table. */
  productName: string;
  /** Decimal string (4dp). */
  quantity: string;
  /** Selling price snapshotted at order time (2dp). */
  unitPrice: string;
  /** `quantity × unitPrice` (2dp). */
  subtotal: string;
};

export type OrderView = {
  id: string;
  /** Human-readable, monotonic order number ("#1043"). */
  number: number;
  locationId: string;
  cashierId: string;
  /** Cashier user name hydrated from User table. */
  cashierName: string;
  orderType: OrderType;
  /** 2dp decimal string, or null on a non-delivery order. */
  deliveryFee: string | null;
  paymentMethod: PaymentMethod;
  customerId: string | null;
  /** Σ line subtotals + deliveryFee (2dp). Recomputed on every write. */
  total: string;
  /** Set when this row is an append-only correction of another order (ADR-15). */
  correctsOrderId: string | null;
  /**
   * On a **correction row** (`correctsOrderId` set): when the correction
   * was recorded (ISO) and the name of the Admin who recorded it (from the
   * `AuditLog` `correct` entry). `null` on an ordinary order. Lets the C4
   * "This order was corrected on {date} by {Admin}" banner name a person
   * (QA S7 — the data-shape gap the 6c PROGRESS entry flagged).
   */
  correctedAt: string | null;
  correctedByName: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  lines: OrderLineView[];
};
