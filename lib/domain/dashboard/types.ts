/**
 * `/admin` Dashboard aggregator shapes (M5 S13). The dashboard is the
 * owner's morning triage + pre-close screen — "is anything wrong, and is
 * the business healthy right now?". It has NO period picker: every figure
 * is "now", "today", or "this week so far".
 *
 * All money is a 2dp decimal string at this boundary (ADR-30). All dates
 * are `YYYY-MM-DD` Africa/Nairobi business dates (`lib/time`).
 *
 * The five bands map 1:1 to `docs/design/flows/dashboard-screen.md`
 * ("Data-shape notes"). Composed from existing domain reads wherever the
 * figure already exists (Position = the same derivations
 * `getFinancialSummary` uses); the ONLY fresh computation is the daily
 * net-profit series (see `trend-series.ts` — it agrees exactly with
 * `getFinancialSummary(day, day)` but does not run 37 stock sweeps).
 */

// ── Band 1 — Position right now ───────────────────────────────────────

/**
 * Balances as of `now` (ADR-57 — a level at a moment). `liquidity` =
 * `cash + mpesaBank`. `ownerOwedToBusiness` is draws − returns (positive =
 * the owner owes the business).
 */
export type DashboardPosition = {
  liquidity: string;
  cash: string;
  mpesaBank: string;
  ownerOwedToBusiness: string;
};

// ── Band 2 — This week so far ─────────────────────────────────────────

/**
 * One day of the current business week. `net` is `null` for days that
 * have not happened yet (the design renders those as a faded stub, NOT a
 * zero bar).
 */
export type WeekDayNet = {
  date: string;
  /** Net profit for that single business day, or `null` if future. */
  net: string | null;
};

/**
 * Week-to-date totals plus the same three figures for the equivalent
 * weekday range one week earlier, so the client computes the "vs. same
 * point last week" deltas itself (the design's exact wording differs per
 * tile — revenue ▲ good, expenses ▲ bad, net is prose).
 */
export type DashboardWeek = {
  /** Monday-first `{ from, to }` of the current business week. */
  from: string;
  to: string;
  /** 7 entries, Mon→Sun. Future days carry `net: null`. */
  dailyNet: WeekDayNet[];
  revenueWtd: string;
  expensesWtd: string;
  netWtd: string;
  /** Same weekday range (Mon → today-1wk) of the previous week. */
  revenuePriorWtd: string;
  expensesPriorWtd: string;
  netPriorWtd: string;
};

// ── Band 3 — Needs attention ─────────────────────────────────────────

export type OpenHandover = {
  handoverId: string;
  locationName: string;
  staffName: string;
  /** Current derived declared total (cash + M-Pesa), decimal string. */
  declaredTotal: string;
  occurredAt: string;
};

export type LowStockItem = {
  productName: string;
  locationName: string;
  /** Signed on-hand quantity (may be negative), 4dp string. */
  qty: string;
  unit: string;
};

/**
 * Everything that could need the owner before they close. Empty
 * collections + zero counts is the "all clear" state — never an error.
 */
export type DashboardNeedsAttention = {
  /** Business dates before today with no `DayClose` row. Ascending. */
  openPriorDates: string[];
  handoversAwaitingReceipt: {
    count: number;
    items: OpenHandover[];
  };
  /** All currently-open handover shortfalls — NOT month-scoped. */
  openShortfalls: {
    count: number;
    total: string;
  };
  lowOrNegativeStock: {
    count: number;
    /** Up to 3, most negative first. */
    top: LowStockItem[];
  };
};

// ── Band 4 — Today's activity ────────────────────────────────────────

export type DashboardToday = {
  date: string;
  /** Money in from restaurant orders + canteen sales today, decimal string. */
  salesSoFar: string;
  stockMovementCount: number;
  purchaseReceiptCount: number;
  handoversReceived: number;
  handoversDue: number;
  /** `AuditLog` rows today with `action = "correct"`. */
  correctionCountToday: number;
};

// ── Band 5 — 30-day trend ────────────────────────────────────────────

export type TrendDayNet = {
  date: string;
  net: string;
};

export type DashboardTrend = {
  /** 30 entries, oldest first. Every day has a value (all are past). */
  dailyNet: TrendDayNet[];
  net30Total: string;
};

// ── v2 — Stock & activity by location (always "now", never period) ────

/**
 * A location's `handoverStatus` today: `"awaiting"` if any of today's
 * handovers at that location has no receipt yet, `"received"` if it has
 * rows and every one is received, `null` if the location has no handover
 * rows today at all (Store — no handover flow, PRD) or genuinely no
 * activity yet. Folded from the SAME rows `GET /api/handovers/reconciliation`
 * returns for the date (`getReconciliation`) — never re-derived.
 */
export type HandoverStatus = "awaiting" | "received" | null;

export type StockActivityByLocation = {
  locationId: string;
  locationName: string;
  /** Count of today's `StockMovement` rows at this location. */
  movementCount: number;
  /** Count of products at this location currently ≤ 0 on hand. */
  lowStockCount: number;
  handoverStatus: HandoverStatus;
};

// ── The aggregate ────────────────────────────────────────────────────

export type DashboardView = {
  /** The business date the dashboard was built for (Africa/Nairobi). */
  date: string;
  position: DashboardPosition;
  week: DashboardWeek;
  needsAttention: DashboardNeedsAttention;
  today: DashboardToday;
  trend: DashboardTrend;
  /** v2 — always "now", ordered Store → Restaurant → Canteen. */
  stockActivity: StockActivityByLocation[];
};
