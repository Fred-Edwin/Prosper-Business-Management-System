"use client";

// M4 S9B — /admin/staff, built to the approved design (Paper "Prosper
// Hotel" · page "M4 S8 — Staff & Pay"; docs/design/flows/staff-screen.md).
//
// LAYOUT (ADR-56 — single admin header row, owned by <AdminPageHeader>):
//   title "Staff & Pay" · (tab-specific control) · (tab-specific primary
//   action) · avatar.
//     • Roster        — no control;  primary "Add staff"
//     • Attendance    — <DatePicker> (backdatable, capped today);
//                       secondary "Mark all present"
//     • Pay & advances— <MonthPicker> (kit has no month picker — a
//                       <Select> month list, the agreed workaround);
//                       primary "Record advance / deduction"
//   <Tabs> directly under the header. On mobile the header collapses to
//   the shell's hamburger row; the tab-specific controls move to a row
//   under the pill tab-strip and the primary action becomes a sticky
//   bottom bar.
//
// The header buttons reach into the active tab through a registered
// callback (same pattern as financials' `registerRecordPayment`). Tab
// bodies are split into their own files from the start.

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { PillFilter } from "@/components/kit/pill-filter";
import { Button } from "@/components/kit/button";
import { DatePicker } from "@/components/kit/date-picker";
import { nairobiToday } from "@/lib/time";
import { dateOf, shortDateWithYear, ymdOf } from "./format";
import { MonthPicker, currentMonth } from "./month-picker";
import { RosterTab } from "./roster-tab";
import { AttendanceTab } from "./attendance-tab";
import { PayTab } from "./pay-tab";

export type StaffTabKey = "roster" | "attendance" | "pay";

const TABS = [
  { key: "roster" as const, label: "Roster", panelId: "staff-panel-roster" },
  {
    key: "attendance" as const,
    label: "Attendance",
    panelId: "staff-panel-attendance",
  },
  { key: "pay" as const, label: "Pay & advances", panelId: "staff-panel-pay" },
];

const VALID: readonly StaffTabKey[] = ["roster", "attendance", "pay"];

/** What an Attendance tab publishes up so the header / sticky bar can drive it. */
export type AttendanceControls = {
  markAllPresent: () => void;
  save: () => void;
  dirty: boolean;
  saving: boolean;
};

export function StaffClient({
  initialTab = "roster",
}: {
  initialTab?: StaffTabKey;
}) {
  const today = React.useMemo(() => nairobiToday(), []);
  const [tab, setTab] = React.useState<StaffTabKey>(
    VALID.includes(initialTab) ? initialTab : "roster",
  );
  const [attDate, setAttDate] = React.useState(today);
  const [month, setMonth] = React.useState(currentMonth());

  const changeTab = React.useCallback((key: string) => {
    setTab(VALID.includes(key as StaffTabKey) ? (key as StaffTabKey) : "roster");
  }, []);

  // Roster "Add staff" — the drawer lives in the tab.
  const addStaffRef = React.useRef<(() => void) | null>(null);
  const registerAddStaff = React.useCallback((fn: () => void) => {
    addStaffRef.current = fn;
  }, []);

  // Pay "Record advance / deduction" — the drawer lives in the Pay tab.
  const recordAdjustmentRef = React.useRef<(() => void) | null>(null);
  const registerRecordAdjustment = React.useCallback((fn: () => void) => {
    recordAdjustmentRef.current = fn;
  }, []);

  // Attendance controls — published by the tab, consumed by the header +
  // the mobile sticky bar. A version bump re-renders the bar when
  // dirty/saving change.
  const attCtrlRef = React.useRef<AttendanceControls | null>(null);
  const [attVersion, bumpAtt] = React.useReducer((n: number) => n + 1, 0);
  const registerAttendanceControls = React.useCallback(
    (c: AttendanceControls) => {
      attCtrlRef.current = c;
      bumpAtt();
    },
    [],
  );

  const datePicker = (
    <DatePicker
      aria-label="Attendance date"
      value={shortDateWithYear(attDate)}
      selected={dateOf(attDate)}
      maxDate={dateOf(today)}
      onSelect={(d) => setAttDate(ymdOf(d))}
    />
  );
  const monthPicker = <MonthPicker value={month} onChange={setMonth} />;

  const headerActions = (
    <>
      {tab === "attendance" && (
        <>
          <div className="hidden md:block">{datePicker}</div>
          <Button
            variant="secondary"
            className="hidden md:inline-flex"
            onClick={() => attCtrlRef.current?.markAllPresent()}
          >
            Mark all present
          </Button>
        </>
      )}
      {tab === "pay" && (
        <>
          <div className="hidden md:block">{monthPicker}</div>
          <Button
            variant="primary"
            className="hidden md:inline-flex"
            onClick={() => recordAdjustmentRef.current?.()}
          >
            Record advance / deduction
          </Button>
        </>
      )}
      {tab === "roster" && (
        <Button
          variant="primary"
          className="hidden md:inline-flex"
          onClick={() => addStaffRef.current?.()}
        >
          Add staff
        </Button>
      )}
    </>
  );

  // Referenced only to re-read the ref after a version bump.
  void attVersion;
  const att = attCtrlRef.current;

  return (
    <PageShell>
      <AdminPageHeader title="Staff & Pay" actions={headerActions} />

      {/* Mobile pill tab-strip. */}
      <div className="md:hidden px-(--sp-6) pt-(--sp-5) pb-(--sp-3) overflow-x-auto">
        <PillFilter
          options={TABS.map((t) => ({ key: t.key, label: t.label }))}
          activeKey={tab}
          onChange={changeTab}
        />
      </div>

      {/* Desktop underline tabs. */}
      <div className="hidden md:block pt-(--sp-6)">
        <Tabs
          tabs={TABS}
          activeKey={tab}
          onChange={changeTab}
          idBase="staff-tabs"
        />
      </div>

      {/* Mobile: Pay-tab month picker row under the tab strip. */}
      {tab === "pay" && (
        <div className="md:hidden flex items-center gap-(--sp-4) px-(--sp-6) py-(--sp-3)">
          {monthPicker}
        </div>
      )}

      <div
        id={`staff-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`staff-tabs-tab-${tab}`}
        className="flex flex-col grow min-h-0 pb-[80px] md:pb-0"
      >
        {tab === "roster" && <RosterTab registerAddStaff={registerAddStaff} />}
        {tab === "attendance" && (
          <AttendanceTab
            date={attDate}
            datePicker={datePicker}
            registerControls={registerAttendanceControls}
          />
        )}
        {tab === "pay" && (
          <PayTab
            month={month}
            today={today}
            registerRecordAdjustment={registerRecordAdjustment}
          />
        )}
      </div>

      {/* Mobile sticky bottom action bar. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 [z-index:var(--z-sticky)] flex items-center px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        {tab === "roster" && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => addStaffRef.current?.()}
          >
            Add staff
          </Button>
        )}
        {tab === "attendance" && (
          <Button
            variant="primary"
            className="w-full"
            disabled={!att?.dirty || att?.saving}
            loading={att?.saving}
            onClick={() => att?.save()}
          >
            Save attendance
          </Button>
        )}
        {tab === "pay" && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => recordAdjustmentRef.current?.()}
          >
            Record advance / deduction
          </Button>
        )}
      </div>

    </PageShell>
  );
}
