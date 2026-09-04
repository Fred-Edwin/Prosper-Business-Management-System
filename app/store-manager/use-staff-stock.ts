"use client";

import * as React from "react";
import type {
  DerivedBalance,
  MovementType,
  NonSaleReason,
  OutstandingPurchases,
  StockMovementView,
} from "@/lib/domain/stock";
import type { ProductWithLocations, Location } from "@/lib/domain/catalog";

/**
 * All Store Manager + Canteen staff-facing stock data-fetching lives here —
 * both hubs, the issue / production / transfer / non-sale flows, the
 * transfer-dispatch flow, and the mobile stock-levels views are pure
 * presentation + orchestration over this hook.
 *
 * Same shape as the Admin `app/admin/stock/use-stock.ts` (Session 7): a
 * `StockRequestError` + a `request<T>` that unwraps `{ data }` / throws on
 * `{ error }`, then a low-level `stockApi` object and a `use*` hook per
 * screen cluster. The F2 endpoints (Session 6, ADR-39 / ADR-40) are
 * unchanged — the client sends **unsigned magnitudes** and renders what
 * comes back; signs / deltas / derived balances are the domain's job.
 *
 * The location-bound roles (`store_manager`, `canteen_attendant`) are
 * scoped server-side to their own `User.staff.locationId` — every list /
 * balance read here is implicitly "my location only" (a foreign
 * `locationId` comes back `[]`, per `docs/API.md`).
 */

export type ApiError = { code: string; message: string; field?: string };

export class StockRequestError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;
  constructor(status: number, err: ApiError) {
    super(err.message);
    this.name = "StockRequestError";
    this.code = err.code;
    this.field = err.field;
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: ApiError }
    | null;

  if (!res.ok || !json || "error" in json) {
    const err: ApiError =
      json && "error" in json
        ? json.error
        : { code: "INTERNAL_ERROR", message: "Request failed." };
    throw new StockRequestError(res.status, err);
  }
  return json.data;
}

// ── Wire input shapes (client → API) ────────────────────────────────────

export type ListMovementsFilter = {
  productId?: string;
  locationId?: string;
  movementType?: MovementType;
  /** YYYY-MM-DD business date. */
  date?: string;
};

/** `movementType: "issue"` — Store → cooking, single `-quantity` row. */
export type IssueInput = {
  productId: string;
  locationId: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
};

/** `movementType: "production"` — Kitchen → Restaurant, `+quantity`. */
export type ProductionInput = {
  productId: string;
  /** Must be a `restaurant` location; `productId` must be `kind = "dish"`. */
  locationId: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
};

/** `movementType: "transfer"` — phase 1: the `-quantity` dispatch row only. */
export type TransferDispatchInput = {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
};

/** `movementType: "non_sale_consumption"` — `-quantity` at `locationId`. */
export type NonSaleInput = {
  productId: string;
  locationId: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
  reason: NonSaleReason;
  /** Required iff `reason === "other"`. */
  reasonNote?: string;
};

/** `movementType: "purchase_receipt"` — `+quantity`, optional payment link. */
export type PurchaseReceiptInput = {
  productId: string;
  locationId: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
  purchasePaymentId?: string | null;
};

// ── Batch bodies (POST /api/stock-movements/<type>/batch) ───────────────
//
// The multi-row picker in the SM / Canteen movement flows (ADR-44 body
// reversal — Option A) submits one atomic batch per flow. One flow-level
// shape + a `lines` array; the domain enforces the §9.8 BLOCK (any line
// over on-hand ⇒ whole batch rejected, nothing written) and rejects an
// empty `lines` / a duplicate `productId`. The single-line `stockApi.*`
// calls above stay for the History / correction paths.

/** One picker row; `quantity` is an unsigned magnitude decimal string. */
export type BatchLine = { productId: string; quantity: string };
/** Receive lines may additionally link a matched purchase payment. */
export type ReceiptBatchLine = BatchLine & { purchasePaymentId?: string | null };

export type ReceiptBatchInput = {
  locationId: string;
  lines: ReceiptBatchLine[];
};
export type IssueBatchInput = { locationId: string; lines: BatchLine[] };
export type ProductionBatchInput = { locationId: string; lines: BatchLine[] };
export type TransferBatchInput = {
  fromLocationId: string;
  toLocationId: string;
  lines: BatchLine[];
};
export type NonSaleBatchInput = {
  locationId: string;
  reason: NonSaleReason;
  /** Required iff `reason === "other"`. */
  note?: string;
  lines: BatchLine[];
};

// ── Low-level API calls (no React state) ────────────────────────────────

export const stockApi = {
  listMovements(filter: ListMovementsFilter): Promise<StockMovementView[]> {
    const params = new URLSearchParams();
    if (filter.productId) params.set("productId", filter.productId);
    if (filter.locationId) params.set("locationId", filter.locationId);
    if (filter.movementType) params.set("movementType", filter.movementType);
    if (filter.date) params.set("date", filter.date);
    return request<StockMovementView[]>(
      `/api/stock-movements?${params.toString()}`,
    );
  },

  /** Batched derived balances as of the end of `asOf` (YYYY-MM-DD), or now. */
  balances(
    productIds: string[],
    locationId: string,
    asOf?: string,
  ): Promise<DerivedBalance[]> {
    if (productIds.length === 0) return Promise.resolve([]);
    const params = new URLSearchParams({
      productIds: productIds.join(","),
      locationId,
    });
    if (asOf) params.set("asOf", asOf);
    return request<DerivedBalance[]>(
      `/api/stock-movements/balances?${params.toString()}`,
    );
  },

  recordIssue(input: IssueInput): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({ movementType: "issue", ...input }),
    });
  },

  recordProduction(input: ProductionInput): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({ movementType: "production", ...input }),
    });
  },

  dispatchTransfer(input: TransferDispatchInput): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({ movementType: "transfer", ...input }),
    });
  },

  recordNonSale(input: NonSaleInput): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({
        movementType: "non_sale_consumption",
        productId: input.productId,
        locationId: input.locationId,
        quantity: input.quantity,
        reason: input.reason,
        reasonNote:
          input.reasonNote && input.reasonNote.trim() !== ""
            ? input.reasonNote.trim()
            : undefined,
      }),
    });
  },

  recordPurchaseReceipt(
    input: PurchaseReceiptInput,
  ): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({ movementType: "purchase_receipt", ...input }),
    });
  },

  // ── Batch writes (one atomic POST per flow) ──────────────────────────

  receiptBatch(input: ReceiptBatchInput): Promise<StockMovementView[]> {
    return request<StockMovementView[]>(
      `/api/stock-movements/receipts/batch`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  issueBatch(input: IssueBatchInput): Promise<StockMovementView[]> {
    return request<StockMovementView[]>(`/api/stock-movements/issues/batch`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  productionBatch(input: ProductionBatchInput): Promise<StockMovementView[]> {
    return request<StockMovementView[]>(
      `/api/stock-movements/production/batch`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  transferBatch(input: TransferBatchInput): Promise<StockMovementView[]> {
    return request<StockMovementView[]>(
      `/api/stock-movements/transfers/batch`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  nonSaleBatch(input: NonSaleBatchInput): Promise<StockMovementView[]> {
    return request<StockMovementView[]>(
      `/api/stock-movements/non-sale/batch`,
      {
        method: "POST",
        body: JSON.stringify({
          locationId: input.locationId,
          reason: input.reason,
          note:
            input.note && input.note.trim() !== ""
              ? input.note.trim()
              : undefined,
          lines: input.lines,
        }),
      },
    );
  },

  /** SM- / Canteen-scoped: purchases the Admin paid for, awaiting a receipt. */
  listOutstanding(): Promise<OutstandingPurchases> {
    return request<OutstandingPurchases>(
      `/api/stock-movements/outstanding`,
    );
  },

  /**
   * Phase 2 of a 2-phase transfer — accept: writes the `+q` counterpart.
   * `receivedQuantity` (unsigned magnitude string) records an adjusted
   * amount when what arrived differs from what was dispatched; omit it to
   * accept the dispatched amount as-is.
   */
  acceptTransfer(
    movementId: string,
    receivedQuantity?: string,
  ): Promise<StockMovementView> {
    return request<StockMovementView>(
      `/api/stock-movements/${movementId}/accept`,
      {
        method: "POST",
        body:
          receivedQuantity != null
            ? JSON.stringify({ receivedQuantity })
            : "{}",
      },
    );
  },

  /**
   * Accept several pending inbound transfers in one go (the Canteen
   * receive-transfer screen). Per-line loop — not one DB transaction; a
   * mid-batch failure leaves the earlier lines accepted, and the screen
   * re-reads to show what's left. Acceptable for this low-volume routine.
   */
  async acceptTransferBatch(
    lines: Array<{ movementId: string; receivedQuantity?: string }>,
  ): Promise<StockMovementView[]> {
    const out: StockMovementView[] = [];
    for (const l of lines) {
      out.push(await this.acceptTransfer(l.movementId, l.receivedQuantity));
    }
    return out;
  },

  /** Phase 2 — flag a discrepancy: records `note`, releases no stock. */
  flagTransfer(movementId: string, note: string): Promise<StockMovementView> {
    return request<StockMovementView>(
      `/api/stock-movements/${movementId}/accept`,
      { method: "POST", body: JSON.stringify({ flag: true, note }) },
    );
  },

  listProducts(): Promise<ProductWithLocations[]> {
    return request<ProductWithLocations[]>(`/api/products`);
  },

  listLocations(): Promise<Location[]> {
    return request<Location[]>(`/api/locations`);
  },
};

// ── Incoming-transfer derivation (ADR-39) ──────────────────────────────

/**
 * An incoming transfer is a `transfer` row with `quantity < 0`,
 * `correctsMovementId = null`, and no sibling `+q` row referencing it —
 * the pending dispatch leg awaiting the receiver's accept. The list is
 * role-scoped server-side; a location-bound caller only sees rows at their
 * own location, so a negative dispatch row visible here whose
 * `transferCounterpartLocationId` is *this* location is an inbound one.
 *
 * `pending` = not yet accepted. The `+q` counterpart, once written, has
 * `correctsMovementId` set to the dispatch id — so a dispatch id present
 * in any row's `correctsMovementId` means it is already accepted.
 *
 * `flagged` is the LEGACY flag-to-admin state — a dispatch row whose note
 * was set by `flagTransfer` (prefixed `"Discrepancy flagged:"`). Every
 * pending dispatch also carries a plain status note
 * (`"Transfer dispatched — awaiting receipt"`), so `flagged` must match
 * that prefix, NOT merely "note is non-empty". The Canteen receive flow
 * no longer sets a flag; this stays only so an older flagged row still
 * renders distinctly on the SM hub.
 */
const FLAG_NOTE_PREFIX = "Discrepancy flagged:";

export type IncomingTransfer = {
  movement: StockMovementView;
  flagged: boolean;
};

export function deriveIncomingTransfers(
  movements: StockMovementView[],
  myLocationId: string | null,
): IncomingTransfer[] {
  const acceptedDispatchIds = new Set(
    movements
      .filter((m) => m.movementType === "transfer" && m.correctsMovementId)
      .map((m) => m.correctsMovementId as string),
  );

  return movements
    .filter(
      (m) =>
        m.movementType === "transfer" &&
        m.correctsMovementId === null &&
        Number.parseFloat(m.quantity) < 0 &&
        !acceptedDispatchIds.has(m.id) &&
        (myLocationId
          ? m.transferCounterpartLocationId === myLocationId
          : true),
    )
    .map((m) => ({
      movement: m,
      flagged: m.note != null && m.note.startsWith(FLAG_NOTE_PREFIX),
    }));
}

// ── Hook: the staff stock data path ────────────────────────────────────

export type StaffStockData = {
  /** Today's movements across this staff member's location scope. */
  movements: StockMovementView[];
  products: ProductWithLocations[];
  locations: Location[];
};

/**
 * Loads everything the staff hub + flows render for a given business
 * `date` (defaults to today). Location scoping is server-side — this hook
 * never passes a `locationId` (the caller's own location is implied).
 *
 * `myLocationId` is resolved from the loaded `movements` / `products`
 * scope when the screens need it for the incoming-transfer derivation;
 * screens that already know their location (via the layout's
 * `locationLabel`) can pass it explicitly to the derive helpers.
 */
export function useStaffStock(date?: string) {
  const [data, setData] = React.useState<StaffStockData>({
    movements: [],
    products: [],
    locations: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [movements, products, locations] = await Promise.all([
        stockApi.listMovements(date ? { date } : {}),
        stockApi.listProducts(),
        stockApi.listLocations(),
      ]);
      setData({ movements, products, locations });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load stock. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

// ── Hook: the mobile stock-levels view (GET …/balances, ADR-40) ────────

export type StockLevelRow = {
  productId: string;
  name: string;
  unitLabel: string;
  /** Signed derived balance as a decimal string, e.g. "46.5000". */
  quantity: string;
};

/**
 * Feeds `store-manager-stock-levels` / `canteen-stock-levels`: the current
 * derived on-hand per product at `locationId`, summed from the ledger by
 * `GET /api/stock-movements/balances` (no stored total). `asOf` omitted →
 * "as of now".
 *
 * `locationId` is required here because `balances` is a batched read keyed
 * by location; a location-bound caller passing a foreign id gets `[]`.
 */
export function useStockLevels(locationId: string | undefined) {
  const [rows, setRows] = React.useState<StockLevelRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!locationId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const products = await stockApi.listProducts();
      const balances = await stockApi.balances(
        products.map((p) => p.id),
        locationId,
      );
      const byId = new Map(balances.map((b) => [b.productId, b.quantity]));
      setRows(
        products
          .map((p) => ({
            productId: p.id,
            name: p.name,
            unitLabel: p.unitLabel,
            quantity: byId.get(p.id) ?? "0.0000",
          }))
          // Products with no stock at this location are noise on a
          // levels view — hide a clean zero (a negative balance is a
          // real signal and stays).
          //
          // NOTE (2026-09-02): the movement picker also reads this hook
          // and then does `availableById.get(p.id) ?? 0`, so a filtered-
          // out clean zero lands back on 0 anyway — no bug, but the
          // picker doesn't actually need the filtering and could read
          // `stockApi.balances` directly. Left as-is; not worth the churn.
          .filter((r) => Number.parseFloat(r.quantity) !== 0),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load stock levels. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

// ── Hook: the stock-card view (opening → movements → closing) ─────────

/**
 * `previousBusinessDate("2026-09-02")` → `"2026-09-01"`. Date-only, so no
 * timezone math is needed — the business date itself is already resolved
 * in `Africa/Nairobi` by the caller / the API.
 */
export function previousBusinessDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** One product's stock card for a business day, at a single location. */
export type StockCardRow = {
  productId: string;
  name: string;
  unitLabel: string;
  /** Carried forward: the prior business day's closing. Decimal string. */
  opening: string;
  /** Signed sum of the day's movements that change stock. Decimal string. */
  movements: string;
  /** `opening + movements`. Decimal string. */
  closing: string;
  /** `true` when nothing moved — the row is a pure carry-forward. */
  resting: boolean;
};

/**
 * Movement types that do NOT change the on-hand figure, and so must not be
 * summed into the day's movement total. Mirrors the Admin ledger's
 * `COLUMN_FOR_TYPE` nulls (`app/admin/stock/derive-ledger.ts`):
 *   - `opening` / `closing` are derived views, never stock deltas here;
 *   - `purchase_payment` is money-only (quantity is always 0);
 *   - `stock_count` records a count, not a movement (the Canteen
 *     derived-sale path writes the resulting delta as its own row).
 */
const NON_STOCK_MOVEMENT: ReadonlySet<MovementType> = new Set<MovementType>([
  "opening",
  "closing",
  "purchase_payment",
  "stock_count",
]);

/**
 * The mobile stock card for `locationId` on business `date`.
 *
 * Same ledger rule as the Admin grid (ADR-11 / ADR-40, CLAUDE.md "ledgers,
 * not stored totals"): **opening is derived, never stored** — it is the
 * running ledger sum evaluated at the end of the previous business day.
 * Closing is `opening + Σ(this day's stock-changing movements)`, which is
 * also exactly the "as of now" balance for today.
 *
 * A product with stock but no movement on `date` is a REAL row —
 * "Opening 40 · — · Closing 40" — not an omission. That was the owner's
 * 2026-09-02 report: the mobile view showed a bare current balance with no
 * day framing, and the Admin grid dropped resting products entirely.
 *
 * Candidate products come from the catalogue's ProductLocation set for
 * this location (where a product is actually stocked) plus anything that
 * moved today; a pair with a 0 opening AND no movement is dropped, so a
 * never-stocked product doesn't clutter the list.
 */
export function useStockCard(
  locationId: string | undefined,
  date: string | undefined,
) {
  const [rows, setRows] = React.useState<StockCardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!locationId || !date) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [products, movements] = await Promise.all([
        stockApi.listProducts(),
        stockApi.listMovements({ locationId, date }),
      ]);

      // Every product stocked at this location, plus anything that moved
      // here today (a transfer counterpart can name a product with no
      // ProductLocation row).
      const candidates = new Set<string>();
      for (const p of products) {
        if (p.deletedAt) continue;
        if (p.locations.some((l) => l.locationId === locationId)) {
          candidates.add(p.id);
        }
      }
      for (const m of movements) candidates.add(m.productId);

      const ids = [...candidates];
      const opening = await stockApi.balances(
        ids,
        locationId,
        previousBusinessDate(date),
      );
      const openingById = new Map(opening.map((b) => [b.productId, b.quantity]));

      // Signed day total per product — the domain already signs each row
      // from this location's point of view.
      const movedById = new Map<string, number>();
      for (const m of movements) {
        if (NON_STOCK_MOVEMENT.has(m.movementType)) continue;
        movedById.set(
          m.productId,
          (movedById.get(m.productId) ?? 0) + Number.parseFloat(m.quantity),
        );
      }

      const productById = new Map(products.map((p) => [p.id, p]));
      const next: StockCardRow[] = [];
      for (const id of ids) {
        const product = productById.get(id);
        if (!product) continue;
        const open = Number.parseFloat(openingById.get(id) ?? "0");
        const moved = movedById.get(id) ?? 0;
        // Never stocked, nothing moved — not a row.
        if (open === 0 && moved === 0) continue;
        next.push({
          productId: id,
          name: product.name,
          unitLabel: product.unitLabel,
          opening: String(open),
          movements: String(moved),
          closing: String(open + moved),
          resting: moved === 0,
        });
      }
      next.sort((a, b) => a.name.localeCompare(b.name));
      setRows(next);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load stock levels. Check your connection and try again.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

// (Removed in ADR-67: `useTransferSourceLevels` resolved a per-product
// source location for the old multi-source SM → Canteen transfer — dishes
// from the Restaurant, goods from the Store. Under the location↔kind model
// both dishes and goods live at the Restaurant, so the transfer is plain
// single-source and reads `useStockLevels(restaurantLocationId)` like every
// other flow.)

// ── Hook: deliveries awaiting receipt (Receive flow — §3.1) ────────────

/**
 * The SM-scoped "Deliveries awaiting receipt" list for the Receive flow:
 * `purchase_payment` rows the Admin has already paid for that have no
 * receipt linked back. Server-side scoped to the SM's own location
 * (`GET /api/stock-movements/outstanding`, widened to `store_manager` in
 * 3-DOMAIN). A failure here is non-fatal — the flow falls back to
 * manual-only receive, so this hook surfaces `error` but the screen just
 * hides the section.
 */
export function useOutstandingDeliveries() {
  const [rows, setRows] = React.useState<StockMovementView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await stockApi.listOutstanding();
      setRows(out.awaitingReceipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load deliveries.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
