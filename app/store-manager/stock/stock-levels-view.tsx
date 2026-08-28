"use client";

// Mobile Stock Levels view — shared by /store-manager/stock and
// /canteen/stock (Session 12, ADR-44 — composed from the kit; artboards
// 986-0 / 9GW-0 superseded). NOT the Admin <DenseLedger> (desktop).
//
// Composition: <DenseSummaryStrip> (line-count + total-units totals) +
// <PillFilter> (product kind) + a mobile card list (kit <Card>-style rows
// with a mono qty) + <EmptyState> / <EmptyState variant="filtered"> /
// <ErrorState>. Fed by useStockLevels → GET /api/stock-movements/balances
// (ADR-40); the client renders the signed derived balance as-is.

import * as React from "react";
import type { ProductKind } from "@prisma/client";
import { DenseSummaryStrip } from "@/components/kit/dense-summary-strip";
import { PillFilter } from "@/components/kit/pill-filter";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { Spinner } from "@/components/kit/spinner";
import { useStockLevels, stockApi } from "@/app/store-manager/use-staff-stock";
import { trimQty } from "@/app/store-manager/staff-stock-format";

type KindFilter = "all" | ProductKind;

const KIND_PILLS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ingredient", label: "Ingredients" },
  { key: "goods", label: "Goods" },
  { key: "dish", label: "Dishes" },
];

export function StockLevelsView({
  locationLabel,
  locationType,
}: {
  locationLabel: string;
  locationType: "store" | "canteen";
}) {
  const [locationId, setLocationId] = React.useState<string | undefined>(undefined);
  const [kind, setKind] = React.useState<KindFilter>("all");

  // Resolve this staff member's own locationId once (the list read is
  // scoped server-side; balances needs the id explicitly).
  React.useEffect(() => {
    let cancelled = false;
    void stockApi.listLocations().then((locs) => {
      if (cancelled) return;
      setLocationId(locs.find((l) => l.type === locationType)?.id);
    });
    return () => {
      cancelled = true;
    };
  }, [locationType]);

  const { rows, loading, error, refresh } = useStockLevels(locationId);
  const [kindById, setKindById] = React.useState<Map<string, ProductKind>>(new Map());

  React.useEffect(() => {
    let cancelled = false;
    void stockApi.listProducts().then((ps) => {
      if (cancelled) return;
      setKindById(new Map(ps.map((p) => [p.id, p.kind])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    kind === "all" ? rows : rows.filter((r) => kindById.get(r.productId) === kind);

  const totalUnits = filtered.reduce(
    (sum, r) => sum + Number.parseFloat(r.quantity),
    0,
  );

  if (error) {
    return (
      <div className="flex flex-col gap-(--sp-5) p-(--sp-6)">
        <ErrorState description={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-(--sp-5) p-(--sp-6)">
      <div className="flex flex-col gap-[2px]">
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-display/display">
          Stock Levels
        </div>
        <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          {locationLabel} · as of now
        </div>
      </div>

      <DenseSummaryStrip
        items={[
          { label: "Lines", value: String(filtered.length) },
          {
            label: "Total units",
            value: trimQty(String(totalUnits)),
            tone: totalUnits < 0 ? "danger" : "default",
            alignEnd: true,
          },
        ]}
        className="w-full"
      />

      <PillFilter
        aria-label="Filter by product kind"
        options={KIND_PILLS}
        activeKey={kind}
        onChange={(k) => setKind(k as KindFilter)}
      />

      {loading ? (
        <div className="flex justify-center py-(--sp-10)">
          <Spinner label="Loading stock levels" />
        </div>
      ) : filtered.length === 0 && rows.length > 0 ? (
        <EmptyState
          variant="filtered"
          title="Nothing in this category"
          description="No products of this kind have stock at this location right now."
          actionLabel="Clear filter"
          onAction={() => setKind("all")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No stock on hand"
          description={`Nothing has a derived balance at ${locationLabel} yet.`}
        />
      ) : (
        <ul className="flex flex-col list-none">
          {filtered.map((r, i) => {
            const n = Number.parseFloat(r.quantity);
            return (
              <li
                key={r.productId}
                className={
                  "flex items-center justify-between gap-(--sp-4) py-(--sp-5)" +
                  (i < filtered.length - 1
                    ? " border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                    : "")
                }
              >
                <div className="flex flex-col gap-[2px] min-w-0">
                  <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm truncate">
                    {r.name}
                  </div>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                    {r.unitLabel}
                  </div>
                </div>
                <div
                  className={
                    "font-mono font-(--weight-semibold) shrink-0 text-sm/micro " +
                    (n < 0 ? "text-danger" : "[color:var(--text-primary)]")
                  }
                >
                  {trimQty(r.quantity)} {r.unitLabel}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
