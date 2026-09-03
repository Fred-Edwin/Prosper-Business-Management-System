"use client";

// M3 S4 — /admin/financials. One screen, one shared business-date picker
// in the toolbar, and ONE inner tab row:
//
//   [ Stock Purchases ] [ Deliveries ] [ Handovers ] [ Expenses ]
//   [ Owner Draws ] [ Profit ]
//
// The date picker (toolbar, defaults to today, no future) scopes every
// tab — change the date and everything re-fetches for that Africa/Nairobi
// business day.
//
// S4 additions:
//   • The KPI strip is WIRED (was "—"/"M3", deferred in S3): the shell
//     fetches GET /api/financials/summary for the picked day and hands it
//     to <KpiStripDesktop> / <KpiGridMobile>.
//   • Three new inner tabs: Expenses, Owner Draws, Profit — all scoped to
//     the toolbar date and sharing the one summary fetch where they need
//     figures from it.

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { DatePicker } from "@/components/kit/date-picker";
import { Button } from "@/components/kit/button";
import { TransactionsTab, type TxTabKey } from "./transactions-tab";
import { KpiStripDesktop, KpiGridMobile } from "./kpi-strip";
import { ExpensesView } from "./expenses-tab";
import { OwnerDrawsView } from "./owner-draws-tab";
import { ProfitSummaryView } from "./profit-summary";
import { nairobiBusinessDate } from "./use-handovers";
import { useFinancialSummary } from "./use-financials";

export type FinancialsTabKey =
  | TxTabKey
  | "expenses"
  | "owner-draws"
  | "profit";

const TABS = [
  { key: "purchases" as const, label: "Stock Purchases", panelId: "fin-panel-purchases" },
  { key: "deliveries" as const, label: "Deliveries", panelId: "fin-panel-deliveries" },
  { key: "handovers" as const, label: "Handovers", panelId: "fin-panel-handovers" },
  { key: "expenses" as const, label: "Expenses", panelId: "fin-panel-expenses" },
  { key: "owner-draws" as const, label: "Owner Draws", panelId: "fin-panel-owner-draws" },
  { key: "profit" as const, label: "Profit", panelId: "fin-panel-profit" },
];

const VALID: readonly FinancialsTabKey[] = [
  "purchases",
  "deliveries",
  "handovers",
  "expenses",
  "owner-draws",
  "profit",
];

/** `YYYY-MM-DD` → "Sep 2, 2026" for the DatePicker trigger. */
function fmtTriggerDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** A local `Date` → `YYYY-MM-DD` (the calendar day the Admin picked). */
function ymdOf(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** `YYYY-MM-DD` → a local `Date` at midnight. */
function dateOf(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function FinancialsClient({
  initialTab = "purchases",
}: {
  initialTab?: FinancialsTabKey;
}) {
  const [tab, setTab] = React.useState<FinancialsTabKey>(
    VALID.includes(initialTab) ? initialTab : "purchases",
  );
  const [date, setDate] = React.useState<string>(() => nairobiBusinessDate());
  const today = nairobiBusinessDate();
  const isToday = date === today;

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useFinancialSummary(date);

  // The payment drawer's open state lives in <TransactionsTab>; it hands
  // the shell a callback so the toolbar "Record Payment" button (Purchases
  // tab only) can trigger it.
  const recordPaymentRef = React.useRef<(() => void) | null>(null);
  const registerRecordPayment = React.useCallback((fn: () => void) => {
    recordPaymentRef.current = fn;
  }, []);

  const changeTab = React.useCallback((key: string) => {
    setTab(VALID.includes(key as FinancialsTabKey) ? (key as FinancialsTabKey) : "purchases");
  }, []);

  const isTxTab =
    tab === "purchases" || tab === "deliveries" || tab === "handovers";

  return (
    <PageShell>
      <AdminPageHeader
        title="Financials & Expenses"
        actions={
          <>
            <DatePicker
              value={fmtTriggerDate(date)}
              selected={dateOf(date)}
              maxDate={dateOf(today)}
              onSelect={(d) => setDate(ymdOf(d))}
              aria-label="Business date"
            />
            {tab === "purchases" && (
              <Button
                variant="primary"
                onClick={() => recordPaymentRef.current?.()}
              >
                Record Payment
              </Button>
            )}
          </>
        }
      />
      {/* KPI strip — wired to the summary endpoint (S4). */}
      <div className="hidden md:block pt-(--sp-6)">
        <KpiStripDesktop summary={summary} loading={summaryLoading} />
      </div>
      <div className="md:hidden">
        <KpiGridMobile summary={summary} loading={summaryLoading} />
      </div>

      <div className="px-(--sp-6) md:px-0 pt-(--sp-6)">
        <Tabs tabs={TABS} activeKey={tab} onChange={changeTab} idBase="fin-tabs" />
      </div>

      <div
        id={`fin-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`fin-tabs-tab-${tab}`}
        className="flex flex-col grow min-h-0"
      >
        {isTxTab ? (
          <TransactionsTab
            tab={tab as TxTabKey}
            date={date}
            isToday={isToday}
            registerRecordPayment={registerRecordPayment}
          />
        ) : tab === "expenses" ? (
          <ExpensesView key={date} date={date} onMutated={refreshSummary} />
        ) : tab === "owner-draws" ? (
          <OwnerDrawsView
            key={date}
            date={date}
            owedToBusiness={summary?.consolidated.ownerOwedToBusiness ?? null}
            onMutated={refreshSummary}
          />
        ) : (
          <ProfitSummaryView
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            onRetry={refreshSummary}
          />
        )}
      </div>
    </PageShell>
  );
}
