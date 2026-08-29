"use client";

import * as React from "react";
import type {
  DerivedBalance,
  MovementType,
  NonSaleReason,
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

  /** Phase 2 of a 2-phase transfer — accept: writes the `+q` counterpart. */
  acceptTransfer(movementId: string): Promise<StockMovementView> {
    return request<StockMovementView>(
      `/api/stock-movements/${movementId}/accept`,
      { method: "POST", body: "{}" },
    );
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
 * `pending` = not yet accepted and not yet flagged. `flagged` rows keep a
 * `note`. The `+q` counterpart, once written, has `correctsMovementId` set
 * to the dispatch id — so a dispatch id present in any row's
 * `correctsMovementId` means it is already accepted.
 */
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
    .map((m) => ({ movement: m, flagged: m.note != null && m.note !== "" }));
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
