"use client";

// M3 S3 — /admin/financials. One screen, one shared business-date picker
// in the toolbar, and ONE inner tab row over transaction types:
//
//   [ Stock Purchases ] [ Deliveries ] [ Handovers ]
//
// The date picker (toolbar, defaults to today, no future) scopes every
// tab — change the date and all three re-fetch for that Africa/Nairobi
// business day. Expenses / owner draws (S4) slot in as more inner tabs
// under the same date.
//
// The old ADR-46 "Reconciliation" table is gone: its four states folded
// into a Status column on the Stock Purchases tab and a Match column on
// Deliveries (one table language, the kit <SimpleTable>).
//
// KPI strip: markup + TODO(mock) kept (S4 Financials owns it), moved
// below the tab row so a screen that currently shows only "—" doesn't
// lead with dead tiles.

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { Tabs } from "@/components/kit/tabs";
import { DatePicker } from "@/components/kit/date-picker";
import { Button } from "@/components/kit/button";
import { TransactionsTab, type TxTabKey } from "./transactions-tab";
import { KpiStripDesktop, KpiGridMobile } from "./kpi-strip";
import { nairobiBusinessDate } from "./use-handovers";

export type FinancialsTabKey = TxTabKey;

const TABS = [
  { key: "purchases" as const, label: "Stock Purchases", panelId: "fin-panel-purchases" },
  { key: "deliveries" as const, label: "Deliveries", panelId: "fin-panel-deliveries" },
  { key: "handovers" as const, label: "Handovers", panelId: "fin-panel-handovers" },
];

const VALID: readonly TxTabKey[] = ["purchases", "deliveries", "handovers"];

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

  // The payment drawer's open state lives in <TransactionsTab>; it hands
  // the shell a callback so the toolbar "Record Payment" button (Purchases
  // tab only) can trigger it.
  const recordPaymentRef = React.useRef<(() => void) | null>(null);
  const registerRecordPayment = React.useCallback((fn: () => void) => {
    recordPaymentRef.current = fn;
  }, []);

  const changeTab = React.useCallback((key: string) => {
    setTab(VALID.includes(key as TxTabKey) ? (key as TxTabKey) : "purchases");
  }, []);

  return (
    <PageShell
      toolbar={
        <>
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Financials &amp; Expenses
          </div>
          <div className="grow" />
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
    >
      {/* KPI strip — above the tab row (markup + TODO(mock) kept; S4 wires
          the values). Financials & Expenses → KPI strip → tab selector. */}
      <div className="hidden md:block pt-(--sp-6)">
        <KpiStripDesktop />
      </div>
      <div className="md:hidden">
        <KpiGridMobile />
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
        <TransactionsTab
          tab={tab}
          date={date}
          isToday={isToday}
          registerRecordPayment={registerRecordPayment}
        />
      </div>
    </PageShell>
  );
}
