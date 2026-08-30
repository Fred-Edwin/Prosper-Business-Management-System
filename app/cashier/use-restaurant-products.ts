"use client";

import * as React from "react";
import type { ProductWithLocations } from "@/lib/domain/catalog";

/**
 * The C2 New-Order product grid + its §3.8 over-stock block. Two reads,
 * one hook:
 *   - `GET /api/products` — the sellable catalogue (`cashier` is in
 *     `PRODUCT_READ_ROLES`; `buyingPrice` is stripped to `null`, never
 *     surfaced here).
 *   - `GET /api/stock-movements/balances?productIds=…&locationId=<Restaurant>`
 *     — the derived Restaurant balance per product, for the tile
 *     "stock-available" count and the per-line block (§3.8). The server
 *     is still the gate; this is a courtesy.
 *
 * The Restaurant `locationId` comes from each product's own
 * `locations[]` (the `GET /api/products` payload carries
 * `locationType`), so the Cashier needs no `/api/locations` access.
 *
 * A product appears in the grid only if it has an **active** Restaurant
 * `ProductLocation` with a selling price (flow doc §"The screens" C2).
 * Quantities stay decimal **strings**.
 */

export type ApiError = { code: string; message: string; field?: string };

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
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
    throw new Error(err.message);
  }
  return json.data;
}

type BalanceRow = { productId: string; locationId: string; quantity: string };

/** A grid tile: one sellable Restaurant product with its derived stock. */
export type RestaurantProduct = {
  id: string;
  name: string;
  unitLabel: string;
  /** Menu category, or `null` → the "Uncategorised" tab. */
  category: string | null;
  /** Restaurant selling price, decimal string (2dp). */
  sellingPrice: string;
  /** Derived Restaurant balance, decimal string (4dp). `"0.0000"` when no rows. */
  stockAvailable: string;
};

export function useRestaurantProducts() {
  const [products, setProducts] = React.useState<RestaurantProduct[]>([]);
  const [restaurantLocationId, setRestaurantLocationId] = React.useState<
    string | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await request<ProductWithLocations[]>(`/api/products`);

      // Keep only products sold at the Restaurant (active + priced).
      type Sellable = {
        p: ProductWithLocations;
        loc: ProductWithLocations["locations"][number];
      };
      const sellable: Sellable[] = [];
      for (const p of raw) {
        const loc = p.locations.find(
          (l) =>
            l.locationType === "restaurant" &&
            l.active &&
            l.sellingPrice != null,
        );
        if (loc) sellable.push({ p, loc });
      }

      const locId =
        sellable.length > 0 ? sellable[0].loc.locationId : null;
      setRestaurantLocationId(locId);

      let balances: Record<string, string> = {};
      if (locId && sellable.length > 0) {
        const ids = sellable.map((x) => x.p.id).join(",");
        const rows = await request<BalanceRow[]>(
          `/api/stock-movements/balances?productIds=${encodeURIComponent(
            ids,
          )}&locationId=${encodeURIComponent(locId)}`,
        );
        balances = Object.fromEntries(rows.map((r) => [r.productId, r.quantity]));
      }

      setProducts(
        sellable.map(({ p, loc }) => ({
          id: p.id,
          name: p.name,
          unitLabel: p.unitLabel,
          category: p.category,
          sellingPrice: loc.sellingPrice as string,
          stockAvailable: balances[p.id] ?? "0.0000",
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { products, restaurantLocationId, loading, error, refresh };
}
