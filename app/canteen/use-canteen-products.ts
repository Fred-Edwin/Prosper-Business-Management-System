"use client";

// Shared Canteen product source — the canteen-sellable set (an active
// `ProductLocation` at a canteen Location with a selling price), from the
// role-scoped `GET /api/canteen/products` (M2 Session 6e). Consumed by K1
// Stock Count (`stock-count-client.tsx`) and the Canteen Transfer Dispatch
// picker (`MovementPickerFlow` mode="dispatch"), so both screens list the
// same set the Attendant can legitimately count / move.

import * as React from "react";

export type CanteenProduct = {
  id: string;
  name: string;
  unitLabel: string;
  category: string | null;
  kind?: string;
  sellingPrice?: string | null;
  locationId?: string;
};

/**
 * `enabled` (default `true`) gates the fetch: `GET /api/canteen/products`
 * is `admin` + `canteen_attendant` only, so the shared `MovementPickerFlow`
 * — which calls this hook on every mode but only *uses* the result in
 * `dispatch` — must pass `enabled={false}` on the Store Manager modes, or
 * every SM stock screen fires a pointless `403`.
 */
export function useCanteenProducts(enabled = true) {
  const [products, setProducts] = React.useState<CanteenProduct[]>([]);
  const [loading, setLoading] = React.useState(enabled);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/canteen/products", {
          headers: { "Content-Type": "application/json" },
        });
        const json = (await res.json()) as
          | { data: CanteenProduct[] }
          | { error: { message: string } };
        if (!res.ok || "error" in json) {
          setError(
            "error" in json ? json.error.message : "Failed to load products.",
          );
          return;
        }
        setProducts(json.data);
      } catch {
        setError("Failed to load canteen products.");
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  return { products, loading, error };
}
