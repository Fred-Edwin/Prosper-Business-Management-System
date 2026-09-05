"use client";

// /admin/financials — v2 (M5 "Dashboard & Financials v2" Session C).
// Approved design: Paper "Prosper Hotel" · page "M5 — Dashboard & Audit",
// `Financials — desktop [v2]` + `Financials — mobile [v2]`. Spec:
// docs/design/flows/financials-screen.md "Structure (v2 — current)" —
// build against that, NOT the superseded M5 section further down.
//
// v2 makes this screen TRANSACTION-FIRST. The entire profit statement —
// Revenue / COGS / Gross / Expenses / Net, plus the per-location table —
// LEFT this screen for /admin (Dashboard v2's "For <period>" zone), and
// so did "Where unsold stock went". Do not rebuild any of it here "for
// convenience": the split is the whole point of v2.
//
// Structure, top to bottom:
//   1. ONE header row (ADR-56): title · range control · tab-contextual
//      primary action · avatar. Mobile drops the range control to its own
//      row so the ~390px header never crowds.
//   2. KPI strip — six tiles, ONE PER TAB, in tab order. Not an
//      independent summary: the active tab's tile is highlighted and
//      clicking a tile switches tabs, so the strip doubles as a tab
//      indicator (<KpiStrip>).
//   3. Debts owed to the business — a real table of WHO owes, each row
//      linking to /admin/customers/[id] (<DebtsCard>).
//   4. Transactions zone — the M5 shape (2px divider, heading + explainer,
//      per-tab toolbar, tables) with a SIXTH tab: Non-Sale Consumption.
//
// DATE SEMANTICS (ADR-57). One control, presets Today / This week / This
// month / Custom, resolving to an inclusive Africa/Nairobi business-date
// range `{ from, to }` (weeks are Monday–Sunday). That pair drives every
// FLOW on the page — the KPI strip and every transaction table. The Debts
// card is the one BALANCE here and is deliberately NOT period-scoped: it
// is "as of today", always, and carries that label (v2's stricter reading
// of ADR-57, matching the Dashboard's "Right now" zone).

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { Button } from "@/components/kit/button";
import { TransactionsTab, type TxTabKey } from "./transactions-tab";
import { ExpensesView } from "./expenses-tab";
import { OwnerDrawsView } from "./owner-draws-tab";
import { NonSaleView } from "./non-sale-tab";
import { KpiStrip, tileSpecs } from "./kpi-strip";
import { DebtsCard } from "./debts-card";
import { AdminDateRangeControl } from "../date-range-control";
import {
  rangeLabel,
  shortBusinessDateWithYear,
  useAdminDateRange,
  type AdminDateRange,
} from "../use-date-range";
import {
  useFinancialSummary,
  useOwingCustomers,
} from "./use-financials";
import { useFinancialsKpis } from "./use-financials-kpis";

export type FinancialsTabKey =
  | TxTabKey
  | "expenses"
  | "owner-draws"
  | "non-sale";

const TABS = [
  { key: "purchases" as const, label: "Stock Purchases", panelId: "fin-panel-purchases" },
  { key: "deliveries" as const, label: "Deliveries", panelId: "fin-panel-deliveries" },
  { key: "handovers" as const, label: "Handovers", panelId: "fin-panel-handovers" },
  { key: "expenses" as const, label: "Expenses", panelId: "fin-panel-expenses" },
  { key: "owner-draws" as const, label: "Owner Draws", panelId: "fin-panel-owner-draws" },
  { key: "non-sale" as const, label: "Non-Sale Consumption", panelId: "fin-panel-non-sale" },
];

const VALID: readonly FinancialsTabKey[] = [
  "purchases",
  "deliveries",
  "handovers",
  "expenses",
  "owner-draws",
  "non-sale",
];

/** "this month" / "today" — the period noun the captions read with. */
function periodNoun(range: AdminDateRange): string {
  return range.preset === "today"
    ? "today"
    : range.preset === "week"
      ? "this week"
      : range.preset === "month"
        ? "this month"
        : "this period";
}

export function FinancialsClient({
  initialTab = "purchases",
}: {
  initialTab?: FinancialsTabKey;
}) {
  const [tab, setTab] = React.useState<FinancialsTabKey>(
    VALID.includes(initialTab) ? initialTab : "purchases",
  );

  const { range, setPreset, setCustomDay, today } = useAdminDateRange();
  const { from, to } = range;
  const isRangeToday = from === today && to === today;

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useFinancialSummary(from, to);

  const {
    kpis,
    error: kpisError,
    refresh: refreshKpis,
  } = useFinancialsKpis(from, to);

  const {
    customers: owingCustomers,
    loading: debtsLoading,
    error: debtsError,
    refresh: refreshDebts,
  } = useOwingCustomers();

  const label = rangeLabel(range);
  const asOfLabel = shortBusinessDateWithYear(to);
  const noun = periodNoun(range);

  /** A write anywhere on the page moves the strip's figures too. */
  const refreshAll = React.useCallback(() => {
    refreshSummary();
    refreshKpis();
  }, [refreshSummary, refreshKpis]);

  // Each tab hands the shell a callback so the header's tab-contextual
  // primary action can trigger the tab's own drawer.
  const recordPaymentRef = React.useRef<(() => void) | null>(null);
  const registerRecordPayment = React.useCallback((fn: () => void) => {
    recordPaymentRef.current = fn;
  }, []);
  const recordNonSaleRef = React.useRef<(() => void) | null>(null);
  const registerRecordNonSale = React.useCallback((fn: () => void) => {
    recordNonSaleRef.current = fn;
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

  const specs = tileSpecs(
    kpis,
    summary
      ? {
          totalExpenses: summary.consolidated.totalExpenses,
          ownerDrawsForPeriod: summary.consolidated.ownerDrawsForPeriod,
          nonSaleTotal: summary.nonSaleConsumption.total,
        }
      : null,
    noun,
  );

  const rangeControl = (
    <AdminDateRangeControl
      range={range}
      today={today}
      onPreset={setPreset}
      onCustomDay={setCustomDay}
    />
  );

  /**
   * Keep the active tab visible in the mobile scroller. Six tabs overflow
   * a 390px row, and selecting one from the KPI strip can select a tab
   * that is scrolled off — so bring it into view whenever it changes.
   */
  const tabScrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = tabScrollRef.current?.querySelector<HTMLElement>(
      `#fin-tabs-tab-${tab}`,
    );
    // jsdom has no layout and no scrollIntoView — guard both.
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [tab]);

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
            {tab === "non-sale" && (
              <Button
                variant="primary"
                onClick={() => recordNonSaleRef.current?.()}
              >
                Record Non-Sale Use
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

      {/* Zones 2 + 3 — the strip and the Debts card. 20px apart on
          desktop / 16px on mobile, per the artboard's body gap. */}
      <div className="flex flex-col gap-(--sp-6) md:gap-(--sp-7) px-(--sp-6) md:px-0 pt-(--sp-6) md:pt-(--sp-8)">
        <KpiStrip
          specs={specs}
          activeTab={tab}
          onSelect={changeTab}
          caption={`${noun === "today" ? "Today" : noun.replace(/^this /, "This ")} at a glance`}
          error={kpisError ?? (summary == null ? summaryError : null)}
          onRetry={refreshAll}
        />

        <DebtsCard
          customers={owingCustomers}
          total={summary?.consolidated.debtsOwedToBusiness ?? null}
          loading={debtsLoading || (summaryLoading && summary == null)}
          error={debtsError ?? summaryError}
          onRetry={() => {
            refreshDebts();
            refreshSummary();
          }}
        />
      </div>

      {/* Zone 4 — Transactions. 2px --border-strong divider + heading. */}
      <div className="flex flex-col mt-(--sp-4) pt-(--sp-6) md:pt-(--sp-8) px-(--sp-6) md:px-0 border-t-2 border-t-solid [border-top-color:var(--border-strong)]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
            Transactions
          </h2>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/[16px]">
            Every recorded money and stock movement for {noun}. The figures
            above are derived from these rows.
          </span>
        </div>

        {/* ONE tab row, at both viewports. Six tabs don't fit a 390px
            row, so on mobile it becomes a horizontal scroller and the
            active tab is scrolled into view (ADR-66's convention is
            "never leave the active control off-screen"; it is honoured
            here by scrolling rather than by re-ordering, because a second
            re-ordered <Tabs> would put a duplicate tablist — duplicate
            tab ids and all — in the accessibility tree at every
            viewport). */}
        <div
          ref={tabScrollRef}
          className="pt-(--sp-5) md:pt-(--sp-6) -mx-(--sp-6) px-(--sp-6) md:mx-0 md:px-0 overflow-x-auto md:overflow-visible"
        >
          <div className="w-max md:w-auto">
            <Tabs
              tabs={TABS}
              activeKey={tab}
              onChange={changeTab}
              idBase="fin-tabs"
            />
          </div>
        </div>
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
            onMutated={refreshAll}
          />
        ) : tab === "owner-draws" ? (
          <OwnerDrawsView
            key={`${from}:${to}`}
            from={from}
            to={to}
            owedToBusiness={summary?.consolidated.ownerOwedToBusiness ?? null}
            asOfLabel={asOfLabel}
            onMutated={refreshAll}
          />
        ) : (
          <NonSaleView
            key={`${from}:${to}`}
            from={from}
            to={to}
            periodLabel={noun}
            total={summary?.nonSaleConsumption.total ?? null}
            dishWasteCostPercent={
              summary?.nonSaleConsumption.dishWasteCostPercent ?? null
            }
            registerRecordNonSale={registerRecordNonSale}
            onMutated={refreshAll}
          />
        )}
      </div>
    </PageShell>
  );
}
