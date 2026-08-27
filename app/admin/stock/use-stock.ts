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
  /** The prior business day's closing balance, per product, at the active location scope. */
  priorClosing: Map<string, string>;
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
 * The Opening column is **derived** (ADR-11): opening = the prior business
 * day's closing = `balances(..., asOf = previousBusinessDate(date))`. The
 * day's own movements come from `listMovements({ date })`. No stored
 * opening/closing column is ever read.
 */
export function useLedger(date: string, locationId?: string) {
  const [data, setData] = React.useState<LedgerData>({
    movements: [],
    priorClosing: new Map(),
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

      // Opening = prior day's closing. Derive it only for the
      // (product, location) pairs that actually appear on this day's
      // ledger, batched per location.
      const prevDate = previousBusinessDate(date);
      const pairsByLocation = new Map<string, Set<string>>();
      for (const m of movements) {
        if (!pairsByLocation.has(m.locationId)) {
          pairsByLocation.set(m.locationId, new Set());
        }
        pairsByLocation.get(m.locationId)!.add(m.productId);
      }

      const priorClosing = new Map<string, string>();
      await Promise.all(
        [...pairsByLocation.entries()].map(async ([loc, productIds]) => {
          const balances = await stockApi.balances(
            [...productIds],
            loc,
            prevDate,
          );
          for (const b of balances) {
            priorClosing.set(`${b.productId}@${b.locationId}`, b.quantity);
          }
        }),
      );

      setData({ movements, priorClosing, products, locations });
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
