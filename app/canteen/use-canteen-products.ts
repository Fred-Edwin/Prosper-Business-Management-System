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

export function useCanteenProducts() {
  const [products, setProducts] = React.useState<CanteenProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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
  }, []);

  return { products, loading, error };
}
