import type { AuditAction, Prisma } from "@prisma/client";
import type { OrderView } from "@/lib/domain/sales";
import type { StockMovementView } from "@/lib/domain/stock";
import type { HandoverView } from "@/lib/domain/handovers";
import type { ExpenseView, OwnerTransactionView } from "@/lib/domain/financials";

/** One sealed business date. `date` is `YYYY-MM-DD` (Africa/Nairobi). */
export type DayCloseView = {
  date: string;
  closedBy: string;
  closedAt: string;
};

/** Status of a single business date for the Admin card / status check. */
export type DayStatusView = {
  date: string;
  closed: boolean;
  closedBy: string | null;
  closedAt: string | null;
};

// ── Audit-log read (M5 S11) ───────────────────────────────────────────

/**
 * One audit-trail row, screen-ready.
 *
 * `oldValue` / `newValue` are the raw `Json` columns as written by each
 * module — returned as-is (no generic deep-diff; that is a screen-session
 * decision). Their shape VARIES BY ACTION — see the S11 report and
 * `docs/API.md` for the per-action keys.
 *
 * `occurredAt` is the business-meaningful timestamp (backdated to the
 * corrected row's day on a `correct`). `recordedAt` is the real insert
 * time (`createdAt`) — use it to show "logged at" for backdated rows.
 */
export type AuditLogEntryView = {
  id: string;
  action: AuditAction;
  actorId: string;
  /** `User.name`; `"(deleted user)"` if the actor row is gone. */
  actorName: string;
  entityType: string;
  entityId: string;
  /** Best-effort human label; `null` → screen shows `entityType #id`. */
  entityLabel: string | null;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  occurredAt: string;
  recordedAt: string;
};

/**
 * One item in a page of the audit trail (M5 S15). Either a `"single"` —
 * one plain `AuditLogEntryView` — or a `"batch"` — several rows that
 * were written in ONE transaction (they share a `correlationId` stamped
 * inside their `newValue`, ADR-25) collapsed to one expandable summary
 * (e.g. "6 items received · Store · 9:14am").
 *
 * The screen renders a `"single"` as a plain row and a `"batch"` as a
 * summary row that expands to `entries`. Pagination pages by ITEM, never
 * by raw row — a batch is never split across two pages (ADR-65).
 */
export type AuditLogItem =
  | { kind: "single"; entry: AuditLogEntryView }
  | {
      kind: "batch";
      /** `batch_<uuid>` — the shared correlation id from `newValue`. */
      correlationId: string;
      /** The `AuditAction` every row in the batch shares (always `create` today). */
      action: AuditAction;
      /** Actor of the batch (uniform — one transaction, one actor). */
      actorId: string;
      actorName: string;
      /** Number of rows in the batch. */
      count: number;
      /** `entityType` when every row shares it, else `null` (mixed batch). */
      entityType: string | null;
      /**
       * `newValue.action` sub-label (`purchase_receipt` / `transfer` /
       * `issue` / `production` / `non_sale_consumption` …) when uniform
       * across the batch, else `null`. The enum `action` is always
       * `create` for stock batches — this is the real verb.
       */
      subAction: string | null;
      /** Newest `occurredAt` in the batch (the batch sorts by this). */
      occurredAt: string;
      /** The individual rows, newest-first — shown in the expansion. */
      entries: AuditLogEntryView[];
    };

export type AuditLogPage = {
  /**
   * The page of items (batches + singles), newest-first. Supersedes the
   * S11 flat `entries` array — a client that wants every raw row still
   * has them inside each `batch`'s `entries` and each `single`'s `entry`.
   */
  items: AuditLogItem[];
  /**
   * Every `User` with ≥1 `AuditLog` row, `{ id, name }`, name-sorted —
   * the Actor filter dropdown's option list (M5 S15). Independent of the
   * current filter / page (one small grouped query), so the dropdown is
   * stable as the investigator pages and filters.
   */
  actors: { id: string; name: string }[];
  page: {
    /** Total ITEMS matching the filter across all pages (batches count once). */
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
};

export type ListAuditLogFilter = {
  /** Inclusive business-date range on `occurredAt` (`YYYY-MM-DD`). */
  from?: string;
  to?: string;
  /** Narrow to one actor (`User.id`). */
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  /**
   * `"significant"` → the investigable subset the screen defaults to
   * (corrections, deletions, day close/reopen, staff/location/payout
   * writes). Omit for everything.
   */
  group?: "significant";
  /** 1..200, default 50. */
  limit?: number;
  /** ≥ 0, default 0. */
  offset?: number;
};

// ── Day detail (M5 S11) ───────────────────────────────────────────────

/**
 * Everything that happened on ONE Africa/Nairobi business date, composed
 * from the existing per-module reads (`listOrders`, `listMovements`,
 * `listHandovers`, `listExpenses`, `listOwnerTransactions`) plus two
 * direct queries the domain has no dedicated read for (`stockCount`,
 * `staffPayout` — noted in the S11 report).
 *
 * Every collection is `[]` on a quiet date — never an error. Admin-only
 * (enforced at the route); the composed reads are called with an
 * `admin` actor context.
 *
 * Row shapes are the SAME view types the individual screens already use,
 * so the day-detail screen reuses their mappers.
 */
export type DayDetailView = {
  businessDate: string;
  closed: boolean;
  closedBy: string | null;
  closedByName: string | null;
  closedAt: string | null;
  orders: OrderView[];
  stockMovements: StockMovementView[];
  handovers: HandoverView[];
  expenses: ExpenseView[];
  ownerTransactions: OwnerTransactionView[];
  stockCounts: DayDetailStockCount[];
  payouts: DayDetailPayout[];
};

export type DayDetailStockCount = {
  id: string;
  productName: string;
  locationName: string;
  countedQuantity: string;
  occurredAt: string;
  countedByName: string | null;
};

export type DayDetailPayout = {
  id: string;
  staffName: string | null;
  month: string;
  netPaid: string;
  paidFromAccount: string;
  expenseId: string;
  recordedByName: string | null;
};
