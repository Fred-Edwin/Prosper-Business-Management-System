"use client";

// M3 S4 — the Owner Draws view: owner draws / returns for the toolbar
// business date, plus the running "owed to business" figure (draws −
// returns across all time, derived — never a stored counter). Rendered as
// an inner tab of /admin/financials. Composed from the kit: <SimpleTable>
// + <StatusChip> + <Button> + <EmptyState> / <ErrorState>, following
// expenses-tab.tsx. The owed-to-business figure comes from the shared
// financial summary (consolidated.ownerOwedToBusiness).

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import type { OwnerTransactionView } from "@/lib/domain/financials";
import { useOwnerTransactions } from "./use-financials";
import { OwnerDrawDrawer } from "./owner-draw-drawer";

function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

export function OwnerDrawsView({
  date,
  owedToBusiness,
  onMutated,
}: {
  date: string;
  /** `consolidated.ownerOwedToBusiness` from the shared summary. */
  owedToBusiness: string | null;
  /** Called after a draw / return so the parent can refresh the summary + KPIs. */
  onMutated: () => void;
}) {
  const { transactions, loading, error, refresh, create } =
    useOwnerTransactions(date);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleCreate = React.useCallback(
    async (input: Parameters<typeof create>[0]) => {
      const row = await create(input);
      onMutated();
      return row;
    },
    [create, onMutated],
  );

  const owed = owedToBusiness != null ? Number(owedToBusiness) : null;

  const columns: SimpleTableColumn<OwnerTransactionView>[] = [
    {
      key: "type",
      header: "Type",
      width: "w-[120px] shrink-0",
      render: (t) =>
        t.type === "draw" ? (
          <StatusChip variant="danger">Draw</StatusChip>
        ) : (
          <StatusChip variant="success">Return</StatusChip>
        ),
    },
    {
      key: "note",
      header: "Note",
      width: "grow basis-0 min-w-[160px]",
      render: (t) =>
        t.note ? (
          <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
            {t.note}
          </span>
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">—</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      width: "w-[120px] shrink-0",
      render: (t) => fmtDate(t.date),
    },
    {
      key: "amount",
      header: "Amount (KES)",
      width: "w-[130px] shrink-0",
      align: "right",
      cell: "mono",
      render: (t) => `${t.type === "draw" ? "−" : "+"}${money(t.amount)}`,
    },
  ];

  const dateLabel = fmtDate(`${date}T12:00:00Z`);

  return (
    <div className="flex flex-col grow min-h-0 gap-(--sp-5) pt-(--sp-6)">
      {/* Running owed-to-business figure. */}
      <div className="flex items-center justify-between gap-(--sp-4) p-(--sp-5) mx-(--sp-6) md:mx-0 rounded-sm border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-subtle)]">
        <div className="flex flex-col gap-(--sp-1)">
          <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
            Owed back to the business
          </span>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            All draws minus all returns — derived, not stored.
          </span>
        </div>
        <span
          className={`font-mono font-(--weight-semibold) text-h1/h1 ${
            owed == null
              ? "[color:var(--text-tertiary)]"
              : owed > 0
                ? "text-danger"
                : owed < 0
                  ? "text-success"
                  : "[color:var(--text-primary)]"
          }`}
        >
          {owed == null ? "—" : `KES ${money(owedToBusiness as string)}`}
        </span>
      </div>

      <div className="flex items-center justify-between gap-(--sp-4) px-(--sp-6) md:px-0">
        <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {loading
            ? "Loading…"
            : `${transactions.length} on ${dateLabel}`}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setDrawerOpen(true)}
        >
          Log Draw / Return
        </Button>
      </div>

      {error ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load owner transactions"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : !loading && transactions.length === 0 ? (
        <div className="px-(--sp-6) md:px-0">
          <EmptyState
            title={`No draws or returns on ${dateLabel}`}
            description="Money the owner takes out of, or puts back into, the business appears here."
            actionLabel="Log Draw / Return"
            onAction={() => setDrawerOpen(true)}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <SimpleTable
              columns={columns}
              rows={transactions}
              rowKey={(t) => t.id}
              loading={loading && transactions.length === 0}
            />
          </div>

          <div className="flex md:hidden flex-col">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex flex-col p-(--sp-5) gap-(--sp-2) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-baseline justify-between gap-(--sp-4)">
                  {t.type === "draw" ? (
                    <StatusChip variant="danger">Draw</StatusChip>
                  ) : (
                    <StatusChip variant="success">Return</StatusChip>
                  )}
                  <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-body/body shrink-0">
                    {t.type === "draw" ? "−" : "+"}KES {money(t.amount)}
                  </span>
                </div>
                <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  {t.note ? `${t.note} · ` : ""}
                  {fmtDate(t.date)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {drawerOpen && (
        <OwnerDrawDrawer
          date={date}
          onCreate={handleCreate}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
