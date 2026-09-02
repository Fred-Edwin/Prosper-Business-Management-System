"use client";

import * as React from "react";
import type {
  DerivedBalance,
  MovementType,
  OutstandingPurchases,
  StockMovementView,
} from "@/lib/domain/stock";
import type { ProductWithLocations, Location } from "@/lib/domain/catalog";

/**
 * All Admin Stock data-fetching lives here — the ledger client, the
 * correction drawer, the bulk opening grid, and the financials client are
 * pure presentation over this hook. Mirrors the `lib/domain/stock` +
 * `lib/domain/catalog` wire types so the wired screens and the API speak
 * the same shapes.
 *
 * Same shape as Session 5's `use-catalog.ts` (CatalogRequestError +
 * `request<T>` that unwraps `{ data }` / throws on `{ error }`), per the
 * Session 7 handoff.
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

export type OpeningStockInput = {
  productId: string;
  locationId: string;
  /** YYYY-MM-DD business date. */
  businessDate: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
};

export type PurchasePaymentInput = {
  productId: string;
  locationId: string;
  supplier: string;
  /** Unsigned magnitude, decimal string. */
  quantity: string;
  /** Money, decimal string. */
  cost: string;
  paidFromAccount: "cash" | "mpesa_bank";
};

export type CorrectionInput = {
  movementId: string;
  /** The corrected FINAL quantity (signed decimal string). Never a delta. */
  correctedQuantity: string;
  note?: string;
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

  outstanding(): Promise<OutstandingPurchases> {
    return request<OutstandingPurchases>(
      `/api/stock-movements/outstanding`,
    );
  },

  correct(input: CorrectionInput): Promise<StockMovementView> {
    return request<StockMovementView>(
      `/api/stock-movements/${input.movementId}/correct`,
      {
        method: "POST",
        body: JSON.stringify({
          correctedQuantity: input.correctedQuantity,
          note: input.note && input.note.trim() !== "" ? input.note.trim() : undefined,
        }),
      },
    );
  },

  setOpeningStock(input: OpeningStockInput): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({ movementType: "opening", ...input }),
    });
  },

  recordPurchasePayment(
    input: PurchasePaymentInput,
  ): Promise<StockMovementView> {
    return request<StockMovementView>(`/api/stock-movements`, {
      method: "POST",
      body: JSON.stringify({ movementType: "purchase_payment", ...input }),
    });
  },

  listProducts(): Promise<ProductWithLocations[]> {
    return request<ProductWithLocations[]>(`/api/products`);
  },

  listLocations(): Promise<Location[]> {
    return request<Location[]>(`/api/locations`);
  },
};

// ── Hook: the ledger's data path ───────────────────────────────────────

export type LedgerData = {
  /** Every movement for the active business day across the active scope. */
  movements: StockMovementView[];
  /**
   * The **selected** business day's closing balance per `${productId}@${locationId}`
   * — i.e. `balances(asOf = date)`, the same figure `GET /api/stock-movements/balances`
   * reports for that date.
   *
   * The ledger's Opening is derived BACKWARDS from this (see `deriveLedgerRows`):
   * `opening = dayClosing − Σ(the day's column movements)`. Deriving it this way
   * rather than reading the prior day's closing directly is what makes the grid
   * self-heal for movement types that feed no column — `opening` and `stock_count`
   * (F4, owner report 2026-09-02). Those rows still move the real balance, so
   * subtracting only the columned movements leaves their effect inside the Opening
   * figure, and Closing can no longer contradict the balances API for the same date.
   */
  dayClosing: Map<string, string>;
  products: ProductWithLocations[];
  locations: Location[];
};

/** Previous YYYY-MM-DD from a YYYY-MM-DD date, computed in UTC (date-only, no TZ math needed). */
export function previousBusinessDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Loads everything the ledger renders for a given business `date` and an
 * optional `locationId` scope (undefined = all locations, Admin only).
 *
 * Both ends of the row are **derived** (ADR-11) — no stored opening/closing
 * column is ever read. This hook fetches the selected day's closing
 * (`balances(..., asOf = date)`); `deriveLedgerRows` then walks backwards to
 * Opening by subtracting the day's columned movements. See `LedgerData.dayClosing`
 * for why that direction, and not `asOf = previousBusinessDate(date)`.
 */
export function useLedger(date: string, locationId?: string) {
  const [data, setData] = React.useState<LedgerData>({
    movements: [],
    dayClosing: new Map(),
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
        stockApi.listMovements({ date, locationId }),
        stockApi.listProducts(),
        stockApi.listLocations(),
      ]);

      // Closing = the day's own derived balance, batched per location;
      // Opening is walked back from it in `deriveLedgerRows`.
      //
      // The candidate (product, location) pairs are NOT just the ones that
      // moved today. A product resting untouched — stock on hand, no
      // movement on the selected day — still belongs on the ledger, with
      // its carried-forward opening equal to its closing. That is the
      // whole point of `deriveLedgerRows`' movement-free branch, and it
      // could never fire while this map was seeded from `movements`
      // alone: a resting product got no balance entry, so it got no row,
      // so the Store's stocked ingredients vanished from every day on
      // which they happened not to move (owner report 2026-09-02).
      //
      // So seed the pairs from the catalogue's ProductLocation set — every
      // place a product is actually stocked — plus today's movements
      // (which can name a pair with no ProductLocation row, e.g. a
      // transfer's counterpart leg). `deriveLedgerRows` then drops the
      // pairs that are flat zero and had no movement, so a product that
      // has never been stocked anywhere still doesn't clutter the grid.
      const pairsByLocation = new Map<string, Set<string>>();
      const addPair = (loc: string, productId: string) => {
        if (locationId && loc !== locationId) return;
        if (!pairsByLocation.has(loc)) pairsByLocation.set(loc, new Set());
        pairsByLocation.get(loc)!.add(productId);
      };
      for (const p of products) {
        if (p.deletedAt) continue;
        for (const pl of p.locations) addPair(pl.locationId, p.id);
      }
      for (const m of movements) addPair(m.locationId, m.productId);

      const dayClosing = new Map<string, string>();
      await Promise.all(
        [...pairsByLocation.entries()].map(async ([loc, productIds]) => {
          const balances = await stockApi.balances([...productIds], loc, date);
          for (const b of balances) {
            dayClosing.set(`${b.productId}@${b.locationId}`, b.quantity);
          }
        }),
      );

      setData({ movements, dayClosing, products, locations });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load the stock ledger.",
      );
    } finally {
      setLoading(false);
    }
  }, [date, locationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
