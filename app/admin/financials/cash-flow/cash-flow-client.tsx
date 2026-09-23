"use client";

// Cash Flow — client feedback item #7
// (docs/client/2026-09-cash-flow-statement-scope.md). Originally a
// Financials tab; moved to its own page after owner feedback that the
// opening/closing summary needed real visual hierarchy and its own KPI
// strip, and that a 7th Financials tab made an already-crowded page
// worse. Own date-range control (own useAdminDateRange instance — not
// shared with /admin/financials), own KPI strip
// (./cash-flow-kpi-strip.tsx), own filters. Read-only — no drawer, no
// create/correct, nothing is written here. Composed from the kit:
// <PageShell> + <Breadcrumb> + <AdminDateRangeControl> + <FilterToolbar>
// + <SimpleTable> + <EmptyState> / <ErrorState>, following
// app/admin/financials/opening/opening-balance-client.tsx for the
// breadcrumb/header shape and expenses-tab.tsx for the filter + table
// shape.

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import type { CashFlowEntry } from "@/lib/domain/financials";
import { useCashFlow } from "../use-financials";
import { AdminDateRangeControl } from "../../date-range-control";
import { useAdminDateRange } from "../../use-date-range";
import { CashFlowKpiStrip } from "./cash-flow-kpi-strip";

const SOURCE_LABEL: Record<string, string> = {
  opening_balance: "Opening balance",
  handover_receipt: "Handover",
  expense: "Expense",
  purchase_payment: "Stock purchase",
  owner_draw: "Owner draw",
  owner_return: "Owner return",
  account_transfer: "Account transfer",
  order: "Order",
  repayment: "Repayment",
  canteen_sale: "Canteen sale",
};

const ACCOUNT_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank",
};

const ALL_ACCOUNTS = "all";
const ALL_SOURCES = "all";
const ALL_DIRECTIONS = "all";

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/** Signed amount, colored — green inflow, red outflow, with a +/− sign. */
function SignedAmount({ amount }: { amount: string }) {
  const n = Number(amount);
  const isInflow = n >= 0;
  return (
    <span
      className={isInflow ? "text-success" : "text-danger"}
    >
      {isInflow ? "+" : "−"}
      {money(Math.abs(n).toFixed(2))}
    </span>
  );
}

export function CashFlowClient() {
  const { range, setPreset, setCustomDay, setCustomRange, today } =
    useAdminDateRange();
  const { from, to } = range;

  const { report, loading, error, refresh } = useCashFlow(from, to);
  const entries = report?.entries ?? [];

  const [account, setAccount] = React.useState<string>(ALL_ACCOUNTS);
  const [source, setSource] = React.useState<string>(ALL_SOURCES);
  const [direction, setDirection] = React.useState<string>(ALL_DIRECTIONS);

  // Filters are client-side — the date range already narrows the fetch,
  // same trade-off comment as expenses-tab.tsx's Category/Account filters.
  const visibleEntries = React.useMemo(() => {
    return entries.filter((e) => {
      if (account !== ALL_ACCOUNTS && e.account !== account) return false;
      if (source !== ALL_SOURCES && e.sourceType !== source) return false;
      if (direction === "in" && Number(e.amount) < 0) return false;
      if (direction === "out" && Number(e.amount) >= 0) return false;
      return true;
    });
  }, [entries, account, source, direction]);

  const filtered =
    account !== ALL_ACCOUNTS || source !== ALL_SOURCES || direction !== ALL_DIRECTIONS;

  function clearFilters() {
    setAccount(ALL_ACCOUNTS);
    setSource(ALL_SOURCES);
    setDirection(ALL_DIRECTIONS);
  }

  const filterControls: FilterControl[] = [
    {
      id: "account",
      kind: "select",
      label: "Account",
      options: [
        { value: ALL_ACCOUNTS, label: "All" },
        ...Object.entries(ACCOUNT_LABEL).map(([value, label]) => ({ value, label })),
      ],
      value: account,
      default: ALL_ACCOUNTS,
    },
    {
      id: "source",
      kind: "select",
      label: "Source",
      options: [
        { value: ALL_SOURCES, label: "All" },
        ...Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label })),
      ],
      value: source,
      default: ALL_SOURCES,
    },
    {
      id: "direction",
      kind: "select",
      label: "Direction",
      options: [
        { value: ALL_DIRECTIONS, label: "All" },
        { value: "in", label: "Inflow" },
        { value: "out", label: "Outflow" },
      ],
      value: direction,
      default: ALL_DIRECTIONS,
    },
  ];

  function onFilterChange(id: string, value: string | boolean | null) {
    const v = value == null ? "" : String(value);
    if (id === "account") setAccount(v || ALL_ACCOUNTS);
    else if (id === "source") setSource(v || ALL_SOURCES);
    else if (id === "direction") setDirection(v || ALL_DIRECTIONS);
  }

  const dateLabel =
    from === to
      ? fmtDate(`${from}T12:00:00Z`)
      : `${fmtDate(`${from}T12:00:00Z`)} – ${fmtDate(`${to}T12:00:00Z`)}`;

  const columns: SimpleTableColumn<CashFlowEntry>[] = [
    {
      key: "occurredAt",
      header: "Date & time",
      width: "w-[170px] shrink-0",
      render: (e) => (
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {fmtDateTime(e.occurredAt)}
        </span>
      ),
    },
    {
      key: "account",
      header: "Account",
      width: "w-[120px] shrink-0",
      render: (e) => ACCOUNT_LABEL[e.account] ?? e.account,
    },
    {
      key: "sourceType",
      header: "Source",
      width: "grow basis-0 min-w-[140px]",
      render: (e) => (
        <span className="font-ui [color:var(--text-primary)] text-sm/sm">
          {SOURCE_LABEL[e.sourceType] ?? e.sourceType}
        </span>
      ),
    },
    {
      key: "note",
      header: "Note",
      width: "grow basis-0 min-w-[140px]",
      render: (e) =>
        e.note ? (
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            {e.note}
          </span>
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">—</span>
        ),
    },
    {
      key: "amount",
      header: "Amount (KES)",
      width: "w-[130px] shrink-0",
      align: "right",
      cell: "mono",
      render: (e) => <SignedAmount amount={e.amount} />,
    },
    {
      key: "runningBalance",
      header: "Running balance (KES)",
      width: "w-[150px] shrink-0",
      align: "right",
      cell: "mono",
      render: (e) => money(e.runningBalance),
    },
  ];

  return (
    <PageShell>
      <AdminPageHeader
        title={
          <Breadcrumb
            items={[
              { label: "Financials", href: "/admin/financials" },
              { label: "Cash Flow" },
            ]}
          />
        }
        actions={
          <div className="hidden md:block">
            <AdminDateRangeControl
              range={range}
              today={today}
              onPreset={setPreset}
              onCustomDay={setCustomDay}
              onCustomRange={setCustomRange}
            />
          </div>
        }
      />

      {/* Mobile: range control gets its own row, same as Financials. */}
      <div className="md:hidden flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Showing
        </span>
        <AdminDateRangeControl
          range={range}
          today={today}
          onPreset={setPreset}
          onCustomDay={setCustomDay}
          onCustomRange={setCustomRange}
        />
      </div>

      <div className="flex flex-col gap-(--sp-5) px-(--sp-6) md:px-0 pt-(--sp-6) pb-(--sp-12)">
        <CashFlowKpiStrip report={report} />

        <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {loading
            ? "Loading…"
            : `${visibleEntries.length} ${visibleEntries.length === 1 ? "movement" : "movements"} · ${dateLabel}`}
        </div>

        <FilterToolbar
          aria-label="Filter cash flow"
          controls={filterControls}
          onChange={onFilterChange}
          onReset={clearFilters}
          resultCount={visibleEntries.length}
          resultNoun="movements"
        />

        {error ? (
          <ErrorState
            title="Couldn't load cash flow"
            description={error}
            onRetry={() => void refresh()}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <SimpleTable
                columns={columns}
                rows={visibleEntries}
                rowKey={(e) => e.id}
                loading={loading && visibleEntries.length === 0}
                emptyState={{
                  variant: filtered ? "filtered" : "default",
                  title: filtered
                    ? "No movements match these filters"
                    : `No money movements for ${dateLabel}`,
                  description: filtered
                    ? "Try a different account, source or direction, or clear the filters."
                    : "Every handover, expense, payment, draw, sale and repayment for the selected range appears here, oldest first.",
                  actionLabel: filtered ? "Clear filters" : undefined,
                  onAction: filtered ? clearFilters : undefined,
                }}
              />
            </div>

            <div className="flex md:hidden flex-col">
              {!loading && visibleEntries.length === 0 && (
                <div className="p-(--sp-5)">
                  <EmptyState
                    variant={filtered ? "filtered" : "default"}
                    title={
                      filtered
                        ? "No movements match these filters"
                        : `No money movements for ${dateLabel}`
                    }
                    description={
                      filtered
                        ? "Try a different account, source or direction, or clear the filters."
                        : "Every handover, expense, payment, draw, sale and repayment for the selected range appears here, oldest first."
                    }
                    actionLabel={filtered ? "Clear filters" : undefined}
                    onAction={filtered ? clearFilters : undefined}
                  />
                </div>
              )}
              {visibleEntries.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col p-(--sp-5) gap-(--sp-2) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  <div className="flex items-baseline justify-between gap-(--sp-4)">
                    <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                      {SOURCE_LABEL[e.sourceType] ?? e.sourceType}
                    </span>
                    <span className="font-mono font-(--weight-semibold) text-body/body shrink-0">
                      <SignedAmount amount={e.amount} />
                    </span>
                  </div>
                  <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                    {e.note ? `${e.note} · ` : ""}
                    {ACCOUNT_LABEL[e.account] ?? e.account} · {fmtDateTime(e.occurredAt)}
                  </div>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                    Balance after: KES {money(e.runningBalance)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
