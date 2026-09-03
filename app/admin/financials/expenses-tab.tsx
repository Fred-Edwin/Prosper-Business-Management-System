"use client";

// M3 S4 — the Expenses view: business expenses for the toolbar business
// date, with an entry drawer and a per-row correction action. Rendered as
// an inner tab of /admin/financials (no own date picker — `date` comes
// down as a prop). Composed from the kit: <SimpleTable> + <StatusChip> +
// <Button> + <EmptyState> / <ErrorState>, following handovers-tab.tsx.

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import type { ExpenseView } from "@/lib/domain/financials";
import { useExpenses } from "./use-financials";
import { ExpenseDrawer } from "./expense-drawer";

const CATEGORY_LABEL: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  transport: "Transport",
  gas_fuel: "Gas / Fuel",
  salaries: "Salaries",
  repairs: "Repairs",
  other: "Other",
};

const ACCOUNT_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank",
};

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

export function ExpensesView({
  from,
  to,
  onMutated,
}: {
  /** Inclusive `YYYY-MM-DD` business-date range from the header control. */
  from: string;
  to: string;
  /** Called after a create / correct so the parent refreshes the summary + KPIs. */
  onMutated?: () => void;
}) {
  const { expenses, loading, error, refresh, create, correct } = useExpenses(
    from,
    to,
  );
  /** A new expense is dated to the range's END day (the day a create makes sense on). */
  const entryDate = to;

  const handleCreate = React.useCallback(
    async (input: Parameters<typeof create>[0]) => {
      const row = await create(input);
      onMutated?.();
      return row;
    },
    [create, onMutated],
  );
  const handleCorrect = React.useCallback(
    async (id: string, amount: string, note?: string) => {
      const row = await correct(id, amount, note);
      onMutated?.();
      return row;
    },
    [correct, onMutated],
  );

  const [drawer, setDrawer] = React.useState<
    { mode: "create" } | { mode: "correct"; target: ExpenseView } | null
  >(null);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const columns: SimpleTableColumn<ExpenseView>[] = [
    {
      key: "category",
      header: "Category",
      width: "w-[130px] shrink-0",
      render: (e) => (
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          {CATEGORY_LABEL[e.category] ?? e.category}
        </span>
      ),
    },
    {
      key: "note",
      header: "Note",
      width: "grow basis-0 min-w-[160px]",
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
      key: "paidFrom",
      header: "Paid from",
      width: "w-[120px] shrink-0",
      render: (e) => ACCOUNT_LABEL[e.paidFromAccount] ?? e.paidFromAccount,
    },
    {
      key: "amount",
      header: "Amount (KES)",
      width: "w-[130px] shrink-0",
      align: "right",
      cell: "mono",
      render: (e) => (
        <span className="flex items-center justify-end gap-(--sp-3)">
          {e.corrected && <StatusChip variant="neutral">Corrected</StatusChip>}
          {money(e.amount)}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      width: "w-[110px] shrink-0",
      align: "right",
      render: (e) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDrawer({ mode: "correct", target: e })}
        >
          Correct
        </Button>
      ),
    },
  ];

  const dateLabel =
    from === to
      ? fmtDate(`${from}T12:00:00Z`)
      : `${fmtDate(`${from}T12:00:00Z`)} – ${fmtDate(`${to}T12:00:00Z`)}`;

  return (
    <div className="flex flex-col grow gap-(--sp-5) pt-(--sp-6)">
      <div className="flex items-center justify-between gap-(--sp-4) px-(--sp-6) md:px-0">
        <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
          {loading
            ? "Loading…"
            : `${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"} · KES ${money(total.toFixed(2))}`}
        </div>
        <Button variant="primary" size="sm" onClick={() => setDrawer({ mode: "create" })}>
          Record Expense
        </Button>
      </div>

      {error ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load expenses"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : (
        <>
          {/* Desktop: the table headers are ALWAYS visible — an empty
              range renders the EmptyState inside the table body and the
              PAGE scrolls to it (no trapped inner strip), exactly like
              the Stock Purchases / Deliveries tabs: `overflow-x-auto` on
              a plain div, no `min-h-0` ancestor. */}
          <div className="hidden md:block overflow-x-auto">
            <SimpleTable
              columns={columns}
              rows={expenses}
              rowKey={(e) => e.id}
              loading={loading && expenses.length === 0}
              emptyState={{
                title: `No expenses for ${dateLabel}`,
                description:
                  "Business expenses the Admin logs over the selected range appear here.",
                actionLabel: "Record Expense",
                onAction: () => setDrawer({ mode: "create" }),
              }}
            />
          </div>

          <div className="flex md:hidden flex-col">
            {!loading && expenses.length === 0 && (
              <div className="p-(--sp-5)">
                <EmptyState
                  title={`No expenses for ${dateLabel}`}
                  description="Business expenses the Admin logs over the selected range appear here."
                  actionLabel="Record Expense"
                  onAction={() => setDrawer({ mode: "create" })}
                />
              </div>
            )}
            {expenses.map((e) => (
              <div
                key={e.id}
                className="flex flex-col p-(--sp-5) gap-(--sp-2) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-baseline justify-between gap-(--sp-4)">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                    {CATEGORY_LABEL[e.category] ?? e.category}
                  </span>
                  <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-body/body shrink-0">
                    KES {money(e.amount)}
                  </span>
                </div>
                <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  {e.note ? `${e.note} · ` : ""}
                  {ACCOUNT_LABEL[e.paidFromAccount] ?? e.paidFromAccount} ·{" "}
                  {fmtDate(e.date)}
                </div>
                <div className="flex items-center gap-(--sp-4)">
                  {e.corrected && (
                    <StatusChip variant="neutral">Corrected</StatusChip>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDrawer({ mode: "correct", target: e })}
                  >
                    Correct
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {drawer && (
        <ExpenseDrawer
          mode={drawer.mode}
          date={entryDate}
          target={drawer.mode === "correct" ? drawer.target : undefined}
          onCreate={handleCreate}
          onCorrect={handleCorrect}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
