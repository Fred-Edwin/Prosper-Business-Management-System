"use client";

// M2 3a — Canteen Derived tab of the merged Sales screen (was A4,
// app/admin/canteen/derived-sales/derived-sales-client.tsx).
//
// COMPOSED from the proven kit — no kit change:
//   • <SalesFilterToolbar> — Product · Date (its existing two filters)
//   • <SimpleTable> — Product · Last counted · Period covered · Units sold
//     (right) · Revenue (right). No row chevron — read-only, no drawer.
//   • <EmptyState> / <ErrorState>
//
// Paper: I5S-0 (populated) / GVN-0 (filtered-empty) / GZO-0 (loading).

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useDerivedSales } from "@/app/canteen/use-stock-count";
import type { DerivedSaleView } from "@/lib/domain/sales";
import { nairobiBusinessDate } from "@/app/cashier/use-orders";
import { SalesFilterToolbar, type FilterControl } from "./filter-toolbar";

// ── Display helpers ────────────────────────────────────────────────────

function fmtMoney(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `KES ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** ISO → "Thu 28 Aug" in Africa/Nairobi */
function fmtDateMed(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** Relative label: "today" / "1 day ago" / "N days ago". */
function relativeDay(iso: string): string {
  const today = nairobiBusinessDate();
  const countedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
  if (countedDate === today) return "today";
  const todayMs = new Date(`${today}T00:00:00+03:00`).getTime();
  const countedMs = new Date(`${countedDate}T00:00:00+03:00`).getTime();
  const days = Math.round((todayMs - countedMs) / 86_400_000);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

const ALL = "__all__";

export function DerivedTab() {
  const [productFilter, setProductFilter] = React.useState<string>(ALL);
  const [dateFilter, setDateFilter] = React.useState<string | null>(null);

  const { rows, loading, error, refresh } = useDerivedSales({
    productId: productFilter === ALL ? undefined : productFilter,
    date: dateFilter ?? undefined,
  });

  // All rows (unfiltered) populate the Product picker options.
  const { rows: allRows } = useDerivedSales({});
  const productOptions = React.useMemo(
    () => [
      { value: ALL, label: "All" },
      ...(() => {
        const seen = new Map<string, string>();
        for (const r of allRows) seen.set(r.productId, r.productName);
        return [...seen.entries()]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id, name]) => ({ value: id, label: name }));
      })(),
    ],
    [allRows],
  );

  const hasFilters = productFilter !== ALL || dateFilter !== null;

  const controls: FilterControl[] = [
    {
      id: "product",
      kind: "select",
      label: "Product",
      options: productOptions,
      value: productFilter,
      default: ALL,
    },
    {
      id: "date",
      kind: "date",
      label: "Date",
      value: dateFilter,
      default: null,
      defaultLabel: "All dates",
    },
  ];

  function onControlChange(id: string, value: string | null) {
    if (id === "product") setProductFilter(value ?? ALL);
    else if (id === "date") setDateFilter(value);
  }

  function resetFilters() {
    setProductFilter(ALL);
    setDateFilter(null);
  }

  const columns: SimpleTableColumn<DerivedSaleView>[] = [
    {
      key: "product",
      header: "Product",
      width: "grow-[1.4] basis-0",
      render: (r) => (
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
          {r.productName}
        </span>
      ),
    },
    {
      key: "lastCounted",
      header: "Last counted",
      width: "grow-[1.6] basis-0",
      render: (r) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {r.lastCountedAt
            ? `${fmtDateMed(r.lastCountedAt)} · ${relativeDay(r.lastCountedAt)}`
            : "Never counted"}
        </span>
      ),
    },
    {
      key: "period",
      header: "Period covered",
      width: "grow-2 basis-0",
      render: (r) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {r.periodStart && r.periodEnd
            ? `${fmtDateMed(r.periodStart)} → ${fmtDateMed(r.periodEnd)}`
            : "—"}
        </span>
      ),
    },
    {
      key: "units",
      header: "Units sold",
      width: "grow-[1.2] basis-0",
      align: "right",
      render: (r) => (
        <span className="font-mono [color:var(--text-primary)] text-body/sm">
          {r.unitsSold != null
            ? Number(r.unitsSold).toLocaleString("en-US")
            : "—"}
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      width: "grow-[1.2] basis-0",
      align: "right",
      render: (r) => (
        <span className="font-mono [color:var(--text-primary)] text-body/sm">
          {r.revenue != null ? fmtMoney(r.revenue) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col w-full pt-(--sp-6)">
      <SalesFilterToolbar
        controls={controls}
        onChange={onControlChange}
        onReset={resetFilters}
        resultCount={rows.length}
        resultNoun="products"
      />

      {error ? (
        <ErrorState
          title="Couldn't load derived sales"
          description={error}
          onRetry={() => void refresh()}
        />
      ) : loading && rows.length === 0 ? (
        <div className="flex flex-col w-full">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center h-[48px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="kit-skeleton h-[14px] w-1/2 mx-(--sp-6)" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          variant={hasFilters ? "filtered" : "default"}
          title={hasFilters ? "No results match" : "No stock counts yet"}
          description={
            hasFilters
              ? "Try a different product or date."
              : "Canteen Attendants record stock counts from the hub. Derived sales will appear here."
          }
          {...(hasFilters
            ? { actionLabel: "Reset filters", onAction: resetFilters }
            : {})}
        />
      ) : (
        <>
          {/* Desktop table (≥ --bp-md) — artboard I5S-0 */}
          <div className="hidden md:block">
            <SimpleTable
              columns={columns}
              rows={rows}
              rowKey={(r) => `${r.productId}-${r.lastCountedAt ?? "none"}`}
              className="w-full"
            />
          </div>

          {/* Mobile card list (< --bp-md) — artboard ILC-0 */}
          <ul className="flex md:hidden flex-col w-full list-none">
            {rows.map((r) => (
              <li
                key={`${r.productId}-${r.lastCountedAt ?? "none"}`}
                className="flex flex-col gap-(--sp-1) py-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-baseline justify-between gap-(--sp-4)">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm min-w-0">
                    {r.productName}
                  </span>
                  <span className="font-mono [color:var(--text-primary)] text-body/sm shrink-0">
                    {r.revenue != null ? fmtMoney(r.revenue) : "—"}
                  </span>
                </div>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {r.lastCountedAt
                    ? `Last counted ${fmtDateMed(r.lastCountedAt)} · ${relativeDay(r.lastCountedAt)}`
                    : "Never counted"}
                </span>
                {r.periodStart && r.periodEnd && (
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {`Covers ${fmtDateMed(r.periodStart)} → ${fmtDateMed(r.periodEnd)}`}
                    {r.unitsSold != null
                      ? ` · ${Number(r.unitsSold).toLocaleString("en-US")} sold`
                      : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
