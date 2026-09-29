"use client";

// Adjustments tab of the merged Sales screen (ADR-92) — the owner's Sold
// edits from the stock ledger, which move revenue like any sale. Mirrors
// `./derived-tab.tsx`:
//
// COMPOSED from the proven kit — no kit change:
//   • <FilterToolbar> — Location (All / Restaurant / Canteen) + search
//   • <SimpleTable> — Date · Location · Product · Units (right) · Revenue
//     (right) · Note. Read-only; an adjustment is changed by entering a
//     new Sold total on the stock ledger, not from here.
//   • <EmptyState> / <ErrorState>
//
// The rows come from the page (sales-client.tsx) — the same fetch feeds the
// KPI strip, so the tab and the strip can never disagree.

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import type { SaleAdjustmentView } from "@/lib/domain/sales";

function fmtSignedMoney(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  const abs = Math.abs(n)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "−" : "+"}KES ${abs}`;
}

function fmtSignedUnits(units: string, unit: string): string {
  const n = Number(units);
  if (!Number.isFinite(n)) return units;
  return `${n < 0 ? "−" : "+"}${Math.abs(n).toLocaleString("en-US")} ${unit}`;
}

/** "2026-09-19" → "Fri 19 Sep" */
function fmtBusinessDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

const ALL = "__all__";

export function AdjustmentsTab({
  rows: fetchedRows,
  loading,
  error,
  onRetry,
}: {
  rows: SaleAdjustmentView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [locationFilter, setLocationFilter] = React.useState<string>(ALL);
  const [search, setSearch] = React.useState("");

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return fetchedRows.filter(
      (r) =>
        (locationFilter === ALL || r.locationType === locationFilter) &&
        (!q ||
          r.productName.toLowerCase().includes(q) ||
          (r.note ?? "").toLowerCase().includes(q)),
    );
  }, [fetchedRows, locationFilter, search]);

  const hasFilters = locationFilter !== ALL || search.trim() !== "";

  const controls: FilterControl[] = [
    {
      id: "location",
      kind: "select",
      label: "Location",
      options: [
        { value: ALL, label: "All" },
        { value: "restaurant", label: "Restaurant" },
        { value: "canteen", label: "Canteen" },
      ],
      value: locationFilter,
      default: ALL,
    },
  ];

  function onControlChange(id: string, value: string | boolean | null) {
    if (id === "location") setLocationFilter(value == null ? ALL : String(value));
  }

  function resetFilters() {
    setLocationFilter(ALL);
    setSearch("");
  }

  const columns: SimpleTableColumn<SaleAdjustmentView>[] = [
    {
      key: "date",
      header: "Date",
      width: "grow-[1.1] basis-0",
      render: (r) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {fmtBusinessDate(r.businessDate)}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      width: "grow basis-0",
      render: (r) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {r.locationName}
        </span>
      ),
    },
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
      key: "units",
      header: "Sold change",
      width: "grow basis-0",
      align: "right",
      render: (r) => (
        <span className="font-mono [color:var(--text-primary)] text-body/sm">
          {fmtSignedUnits(r.unitsSold, r.unitLabel)}
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
          {fmtSignedMoney(r.revenue)}
        </span>
      ),
    },
    {
      key: "note",
      header: "Note",
      width: "grow-[1.6] basis-0",
      render: (r) => (
        <span className="font-ui [color:var(--text-secondary)] text-body/sm">
          {r.note ?? "—"} · {r.recordedByName}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col w-full pt-(--sp-6)">
      <p className="font-ui [color:var(--text-disabled)] text-caption/micro px-(--sp-6) pb-(--sp-3) md:px-0">
        Changes made to the Sold column on the Stock ledger. Each one moves
        stock and revenue together and is already included in the totals
        above. To change one, enter a new Sold figure on the ledger.
      </p>
      <FilterToolbar
        aria-label="Filter sale adjustments"
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products or notes…"
            aria-label="Search adjustments"
          />
        }
        controls={controls}
        onChange={onControlChange}
        onReset={resetFilters}
        resultCount={rows.length}
        resultNoun="adjustments"
      />

      {error ? (
        <ErrorState
          title="Couldn't load sale adjustments"
          description={error}
          onRetry={onRetry}
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
          title={hasFilters ? "No results match" : "No adjustments in this period"}
          description={
            hasFilters
              ? "Try a different location or search."
              : "Sold figures corrected on the Stock ledger appear here."
          }
          {...(hasFilters ? { actionLabel: "Reset filters", onAction: resetFilters } : {})}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <SimpleTable columns={columns} rows={rows} rowKey={(r) => r.id} className="w-full" />
          </div>

          <ul className="flex md:hidden flex-col w-full list-none">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-(--sp-1) py-(--sp-5) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-baseline justify-between gap-(--sp-4)">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm min-w-0">
                    {r.productName}
                  </span>
                  <span className="font-mono [color:var(--text-primary)] text-body/sm shrink-0">
                    {fmtSignedMoney(r.revenue)}
                  </span>
                </div>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {`${fmtBusinessDate(r.businessDate)} · ${r.locationName} · ${fmtSignedUnits(
                    r.unitsSold,
                    r.unitLabel,
                  )}`}
                </span>
                <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                  {`${r.note ?? "No note"} · ${r.recordedByName}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
