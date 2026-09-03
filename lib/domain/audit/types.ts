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

export type AuditLogPage = {
  entries: AuditLogEntryView[];
  page: {
    /** Total rows matching the filter (across all pages). */
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
