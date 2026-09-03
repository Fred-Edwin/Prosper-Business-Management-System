// M3-S1 — the Admin Dashboard's Day Close card (ADR-52). One card, no new
// route: today's status + a close/reopen toggle + the recent closed dates
// with a per-row reopen. Composed from the frozen kit (<PageShell>,
// <SimpleTable>, <ToggleSwitch>, <Button>, <EmptyState>/<ErrorState>,
// <Spinner>, <StatusChip>); reopening is deliberately low-friction (a
// plain toggle / a one-tap row button, no confirm dialog) per the owner
// decision. Data path: `useDayClose()`.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import {
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/kit/simple-table";
import { ToggleSwitch } from "@/components/kit/toggle-switch";
import { Button } from "@/components/kit/button";
import { ErrorState } from "@/components/kit/error-state";
import { Spinner } from "@/components/kit/spinner";
import { StatusChip } from "@/components/kit/status-chip";
import { useToast } from "@/components/kit/toast";
import type { DayCloseView } from "@/lib/domain/audit";
import { useDayClose } from "./use-day-close";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09-02" → "Sep 2, 2026". */
function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** ISO instant → "2 Sep 2026, 17:03" (Africa/Nairobi). */
function displayDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DayCloseClient() {
  const { today, recent, loading, error, close, reopen } = useDayClose();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function run(action: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      toast(message);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onToggleToday(next: boolean) {
    if (!today) return;
    void run(
      () => (next ? close(today.date) : reopen(today.date)),
      `${displayDate(today.date)} ${next ? "closed" : "reopened"}`,
    );
  }

  function onReopenRow(date: string) {
    void run(() => reopen(date), `${displayDate(date)} reopened`);
  }

  const recentColumns: SimpleTableColumn<DayCloseView>[] = [
    {
      key: "date",
      header: "Business date",
      width: "grow min-w-[140px]",
      cell: "strong",
      render: (r) => displayDate(r.date),
    },
    {
      key: "closedAt",
      header: "Closed",
      width: "w-[180px]",
      render: (r) => displayDateTime(r.closedAt),
    },
    {
      key: "action",
      header: "Action",
      width: "w-[110px]",
      align: "right",
      render: (r) => (
        <Button
          variant="tertiary"
          size="sm"
          disabled={busy}
          onClick={() => onReopenRow(r.date)}
        >
          Reopen
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <AdminPageHeader title="Dashboard" />
      <section
        aria-labelledby="day-close-heading"
        className="flex flex-col gap-(--sp-6) border border-solid [border-color:var(--border-subtle)] [background:var(--surface-raised)] p-(--sp-7) max-w-[680px]"
      >
        <div className="flex flex-col gap-(--sp-3)">
          <h2
            id="day-close-heading"
            className="font-ui font-(--weight-semibold) text-[color:var(--text-primary)]"
          >
            Day Close
          </h2>
          <p className="font-ui text-sm/sm [color:var(--text-secondary)]">
            Sealing a date freezes its cash, variance and profit figures.
            Staff can no longer edit their entries for a sealed date; you can
            still amend it as a correction. Reopening is a single toggle, and
            every close and reopen is written to the audit log.
          </p>
        </div>

        {error ? (
          <ErrorState title="Couldn't load Day Close" description={error} />
        ) : loading || !today ? (
          <div className="flex items-center gap-(--sp-4) py-(--sp-5)">
            <Spinner />
            <span className="font-ui text-sm/sm [color:var(--text-secondary)]">
              Loading…
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-(--sp-5) border border-solid [border-color:var(--border-subtle)] p-(--sp-5)">
              <div className="flex flex-col gap-(--sp-2)">
                <span className="font-ui font-(--weight-medium) [color:var(--text-primary)]">
                  Today — {displayDate(today.date)}
                </span>
                <span className="font-ui text-sm/sm [color:var(--text-secondary)]">
                  {today.closed
                    ? `Closed${today.closedAt ? ` · ${displayDateTime(today.closedAt)}` : ""}`
                    : "Open"}
                </span>
              </div>
              <div className="flex items-center gap-(--sp-4) shrink-0">
                <StatusChip variant={today.closed ? "neutral" : "success"}>
                  {today.closed ? "Closed" : "Open"}
                </StatusChip>
                <ToggleSwitch
                  checked={today.closed}
                  disabled={busy}
                  onChange={onToggleToday}
                  aria-label={today.closed ? "Reopen today" : "Close today"}
                />
              </div>
            </div>

            <div className="flex flex-col gap-(--sp-4)">
              <h3 className="font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase [color:var(--text-tertiary)]">
                Recently closed
              </h3>
              <SimpleTable
                columns={recentColumns}
                rows={recent}
                rowKey={(r) => r.date}
                emptyState={{
                  title: "No dates closed yet",
                  description:
                    "Close today or a past date to start the reconciliation record.",
                }}
              />
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}
