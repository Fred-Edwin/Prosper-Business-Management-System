"use client";

// M3 S7 — /admin/financials, rebuilt to the approved redesign (Paper
// "Prosper Hotel" · page "M3 S5 — Financials redesign") + the S7
// date-range control.
//
// LAYOUT (approved):
//   • ONE header row (ADR-56): title · range control · Record Payment ·
//     avatar. On mobile the range control drops to its own "Date Row"
//     below the header so the ~390px header never crowds.
//   • The Profit panel is PROMOTED OUT of the tab row — it is a summary,
//     not a transaction log — into an always-on block above the tabs
//     (<ProfitPanelDesktop> / <ProfitPanelMobile>).
//   • FIVE tabs below: Stock Purchases · Deliveries · Handovers ·
//     Expenses · Owner Draws. (Profit is no longer a tab.)
//
// M5 S14: the "Position & balances" KPI strip was REMOVED from this
// screen — it now lives ONLY on the `/admin` dashboard (Band 1). This
// screen is analysis-only: the range control, the profit report, the
// five transaction tabs.
//
// DATE SEMANTICS (ADR-57). One control, presets Today / This week / This
// month / Custom, resolving to an inclusive Africa/Nairobi business-date
// range `{ from, to }` (weeks are Monday–Sunday). That pair drives every
// figure:
//   • FLOWS (revenue, COGS, profit, expenses, non-sale, the transaction
//     tables) take the WHOLE range.
//   • BALANCES (cash, M-Pesa/bank, debts owed, owed by owner) are read
//     "as of the end of `to`" — the domain does this split itself.
// The KPI caption and the balance sub-labels say "as of <date>" so a
// point-in-time figure is never misread as a range total.

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { Button } from "@/components/kit/button";
import { TransactionsTab, type TxTabKey } from "./transactions-tab";
import { ExpensesView } from "./expenses-tab";
import { OwnerDrawsView } from "./owner-draws-tab";
import { ProfitPanelDesktop } from "./profit-panel";
import { ProfitPanelMobile } from "./profit-panel-mobile";
import { FinancialsRangeControl } from "@/app/admin/date-range-control";
import {
  rangeLabel,
  shortBusinessDateWithYear,
  useFinancialsRange,
} from "@/app/admin/use-date-range";
import { useFinancialSummary } from "./use-financials";

export type FinancialsTabKey = TxTabKey | "expenses" | "owner-draws";

const TABS = [
  { key: "purchases" as const, label: "Stock Purchases", panelId: "fin-panel-purchases" },
  { key: "deliveries" as const, label: "Deliveries", panelId: "fin-panel-deliveries" },
  { key: "handovers" as const, label: "Handovers", panelId: "fin-panel-handovers" },
  { key: "expenses" as const, label: "Expenses", panelId: "fin-panel-expenses" },
  { key: "owner-draws" as const, label: "Owner Draws", panelId: "fin-panel-owner-draws" },
];

const VALID: readonly FinancialsTabKey[] = [
  "purchases",
  "deliveries",
  "handovers",
  "expenses",
  "owner-draws",
];

export function FinancialsClient({
  initialTab = "purchases",
}: {
  initialTab?: FinancialsTabKey;
}) {
  const [tab, setTab] = React.useState<FinancialsTabKey>(
    VALID.includes(initialTab) ? initialTab : "purchases",
  );

  const { range, setPreset, setCustomDay, today } = useFinancialsRange();
  const { from, to } = range;
  const isRangeToday = from === today && to === today;

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useFinancialSummary(from, to);

  const label = rangeLabel(range);
  const asOfLabel = shortBusinessDateWithYear(to);

  // The payment drawer's open state lives in <TransactionsTab>; it hands
  // the shell a callback so the header "Record Payment" button (Purchases
  // tab only) can trigger it.
  const recordPaymentRef = React.useRef<(() => void) | null>(null);
  const registerRecordPayment = React.useCallback((fn: () => void) => {
    recordPaymentRef.current = fn;
  }, []);

  const changeTab = React.useCallback((key: string) => {
    setTab(
      VALID.includes(key as FinancialsTabKey)
        ? (key as FinancialsTabKey)
        : "purchases",
    );
  }, []);

  const isTxTab =
    tab === "purchases" || tab === "deliveries" || tab === "handovers";

  const rangeControl = (
    <FinancialsRangeControl
      range={range}
      today={today}
      onPreset={setPreset}
      onCustomDay={setCustomDay}
    />
  );

  return (
    <PageShell>
      <AdminPageHeader
        title="Financials & Expenses"
        actions={
          <>
            {/* Desktop: range control sits in the header row. */}
            <div className="hidden md:block">{rangeControl}</div>
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

      {/* Mobile: range control gets its own row so the header stays uncrowded. */}
      <div className="md:hidden flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Showing
        </span>
        {rangeControl}
      </div>

      {/* Always-on Profit panel — promoted out of the tab row. The
          position/balances KPI strip that used to sit above it moved to
          the `/admin` dashboard (M5 S14). */}
      <ProfitPanelDesktop
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={refreshSummary}
        rangeLabel={label}
      />
      <ProfitPanelMobile
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={refreshSummary}
        rangeLabel={label}
        asOfLabel={asOfLabel}
      />

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
            from={from}
            to={to}
            isRangeToday={isRangeToday}
            registerRecordPayment={registerRecordPayment}
          />
        ) : tab === "expenses" ? (
          <ExpensesView
            key={`${from}:${to}`}
            from={from}
            to={to}
            onMutated={refreshSummary}
          />
        ) : (
          <OwnerDrawsView
            key={`${from}:${to}`}
            from={from}
            to={to}
            owedToBusiness={summary?.consolidated.ownerOwedToBusiness ?? null}
            asOfLabel={asOfLabel}
            onMutated={refreshSummary}
          />
        )}
      </div>
    </PageShell>
  );
}
