"use client";

// A4 — Admin Canteen Derived Sales
// Matches Paper GL2-0:
//   Breadcrumb: Sales / Canteen — derived sales
//   H1: Canteen Derived Sales
//   Filter row: Product (G5 — functional dropdown) + Date range (date input)
//   Table cols: Product · Last counted · Period covered · Units sold (right) · Revenue (right)
//   No row chevron — read-only, no detail drawer for M2.
//
// Kit notes:
//   - PageShell: toolbar prop for breadcrumb + heading row
//   - SimpleTableColumn: requires width + align (not headerAlign)
//   - DerivedSaleView: periodStart / periodEnd (not periodFrom); nullable fields
//   - SearchInput onChange: (value: string) => void

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useDerivedSales } from "@/app/canteen/use-stock-count";
import type { DerivedSaleView } from "@/lib/domain/sales";
import { nairobiBusinessDate } from "@/app/cashier/use-orders";

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

// ── Filter chip atoms ──────────────────────────────────────────────────

function ActiveFilterChip({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center h-(--control-sm) px-(--sp-4) rounded-lg gap-(--sp-2) bg-(--surface-selected) border border-solid border-accent">
      <span className="font-ui font-(--weight-medium) text-accent text-sm/sm">
        {label}
      </span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onDismiss}
        className="kit-focus-ring rounded-full"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" aria-hidden
          style={{ flexShrink: 0 }}
        >
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── A4 Main component ─────────────────────────────────────────────────

export function DerivedSalesClient() {
  const [productFilter, setProductFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("");
  const [showProductPicker, setShowProductPicker] = React.useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const { rows, loading, error, refresh } = useDerivedSales({
    productId: productFilter || undefined,
    date: dateFilter || undefined,
  });

  // All rows (unfiltered) to populate the product picker options.
  const { rows: allRows } = useDerivedSales({});
  const productOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of allRows) seen.set(r.productId, r.productName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [allRows]);

  const hasFilters = productFilter !== "" || dateFilter !== "";

  // Table columns — all require `width` per SimpleTableColumn contract.
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
    <PageShell
      toolbar={
        <div className="flex flex-col gap-(--sp-3) w-full">
          <Breadcrumb
            items={[
              { label: "Sales", href: "/admin/canteen/derived-sales" },
              { label: "Canteen — derived sales" },
            ]}
          />
          <h1 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Canteen Derived Sales
          </h1>
        </div>
      }
    >
      {/* Filter chip row — matches Paper GL2-0 */}
      <div className="flex items-center flex-wrap py-(--sp-5) gap-(--sp-3) px-(--sp-6)">
        {productFilter ? (
          <ActiveFilterChip
            label={productOptions.find((p) => p.id === productFilter)?.name ?? productFilter}
            onDismiss={() => setProductFilter("")}
          />
        ) : (
          <div className="relative">
            <button
              type="button"
              id="a4-product-filter-btn"
              onClick={() => {
                setShowProductPicker((v) => !v);
                setShowDatePicker(false);
              }}
              className="flex items-center h-(--control-sm) px-(--sp-4) rounded-lg border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
            >
              <span className="font-ui [color:var(--text-secondary)] text-sm/sm">Product</span>
            </button>
            {showProductPicker && productOptions.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 z-20 flex flex-col rounded-md border border-solid [border-color:var(--border-strong)] bg-(--surface-page) shadow-md min-w-[180px]">
                {productOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProductFilter(p.id); setShowProductPicker(false); }}
                    className="flex items-center h-(--control-md) px-(--sp-4) font-ui [color:var(--text-primary)] text-sm/sm text-left kit-interactive kit-focus-ring"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {dateFilter ? (
          <ActiveFilterChip
            label={dateFilter}
            onDismiss={() => setDateFilter("")}
          />
        ) : (
          <div className="relative">
            <button
              type="button"
              id="a4-date-filter-btn"
              onClick={() => { setShowDatePicker((v) => !v); setShowProductPicker(false); }}
              className="flex items-center h-(--control-sm) px-(--sp-4) rounded-lg border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
            >
              <span className="font-ui [color:var(--text-secondary)] text-sm/sm">Date range</span>
            </button>
            {showDatePicker && (
              <div className="absolute top-[calc(100%+4px)] left-0 z-20 flex flex-col gap-(--sp-2) p-(--sp-4) rounded-md border border-solid [border-color:var(--border-strong)] bg-(--surface-page) shadow-md">
                <label htmlFor="a4-date-input" className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  Count date
                </label>
                <input
                  id="a4-date-input"
                  type="date"
                  className="font-ui [color:var(--text-primary)] text-sm/sm border border-solid [border-color:var(--border-strong)] rounded-sm px-(--sp-3) py-(--sp-2) bg-(--surface-page) kit-focus-ring"
                  onChange={(e) => {
                    if (e.target.value) { setDateFilter(e.target.value); setShowDatePicker(false); }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setProductFilter(""); setDateFilter(""); }}
            className="font-ui font-(--weight-medium) text-accent text-caption/micro kit-focus-ring rounded-sm"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Table / states */}
      {error ? (
        <ErrorState
          title="Couldn't load derived sales"
          description={error}
          onRetry={() => void refresh()}
        />
      ) : loading && rows.length === 0 ? (
        <div className="flex flex-col w-full">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center h-[48px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
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
        />
      ) : (
        <SimpleTable
          columns={columns}
          rows={rows}
          rowKey={(r) => `${r.productId}-${r.lastCountedAt ?? "none"}`}
          className="w-full"
        />
      )}
    </PageShell>
  );
}
