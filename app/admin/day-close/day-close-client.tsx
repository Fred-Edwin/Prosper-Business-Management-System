// M3-S1 — Day Close (ADR-52). Today's status + a close/reopen toggle +
// the recent closed dates with a per-row reopen. Composed from the frozen
// kit (<SimpleTable>, <ToggleSwitch>, <Button>, <ErrorState>, <Spinner>,
// <StatusChip>, <Drawer>); reopening is deliberately low-friction (a plain
// toggle / a one-tap row button, no confirm dialog) per the owner
// decision. Data path: `useDayClose()`.
//
// M5-S14: the card moved onto the `/admin` dashboard (Band 5).
//
// v2 (owner-requested, 2026-09-05): the M3 card was a full bordered
// island capped at max-w-[560/680px] while every other Dashboard zone
// spans the full grid — it visibly misaligned the desktop layout, and
// the owner asked for it to "just be a toggle" instead. `<DayCloseRow>`
// is now a single full-width status+toggle row with no card chrome; the
// "Recently closed" table AND the open-prior-dates list (previously only
// surfaced one at a time via the Needs-attention "Review day →" link,
// which had nowhere real to go) both moved into `<DayCloseHistoryDrawer>`,
// opened via a "History →" link next to the toggle. The toggle itself
// stays today-only and stateless about which date is "selected" — every
// other date (open or closed) is closed/reopened from its own row inside
// the drawer, never by retargeting the toggle.
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
import { Drawer } from "@/components/kit/drawer";
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

/**
 * The Day Close row — a slim, full-width status + toggle, no card chrome.
 * Rendered on the `/admin` dashboard; `openPriorDates` (from the
 * dashboard's Needs-attention zone) feeds the History drawer so an open
 * date before today has somewhere to actually be closed from.
 */
export function DayCloseRow({
  openPriorDates = [],
  highlightDate,
  openHistorySignal,
  className,
}: {
  /** Business dates before today with no `DayClose` row (ascending). */
  openPriorDates?: string[];
  /** A specific date to scroll/highlight when the History drawer opens —
   *  set by the Needs-attention "Review day →" link. */
  highlightDate?: string | null;
  /** Bump this (e.g. a counter) to force the History drawer open even if
   *  `highlightDate` repeats the same value as last time. */
  openHistorySignal?: number;
  className?: string;
}) {
  const { today, recent, loading, error, close, reopen } = useDayClose();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  React.useEffect(() => {
    if (openHistorySignal !== undefined) setHistoryOpen(true);
  }, [openHistorySignal]);

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

  return (
    <div
      className={`flex items-center justify-between gap-(--sp-5) py-(--sp-5) px-(--sp-6) rounded-md border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-subtle)] ${className ?? ""}`}
    >
      {error ? (
        <ErrorState title="Couldn't load Day Close" description={error} />
      ) : loading || !today ? (
        <div className="flex items-center gap-(--sp-4)">
          <Spinner />
          <span className="font-ui text-sm/sm [color:var(--text-secondary)]">
            Loading Day Close…
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-(--sp-4) min-w-0">
            <span className="shrink-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
              Day Close — {displayDate(today.date)}
            </span>
            <StatusChip variant={today.closed ? "neutral" : "success"}>
              {today.closed ? "Closed" : "Open"}
            </StatusChip>
            {today.closed && today.closedAt && (
              <span className="hidden md:inline font-ui text-caption/caption [color:var(--text-tertiary)]">
                {displayDateTime(today.closedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-(--sp-5) shrink-0">
            {openPriorDates.length > 0 && (
              <span className="hidden md:inline font-ui text-caption/caption [color:var(--color-warning)]">
                {openPriorDates.length} open before today
              </span>
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="font-ui font-(--weight-medium) [color:var(--color-accent)] text-caption/caption no-underline hover:underline"
            >
              History →
            </button>
            <ToggleSwitch
              checked={today.closed}
              disabled={busy}
              onChange={onToggleToday}
              aria-label={today.closed ? "Reopen today" : "Close today"}
            />
          </div>
        </>
      )}

      <DayCloseHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        openPriorDates={openPriorDates}
        recent={recent}
        highlightDate={highlightDate}
        busy={busy}
        onCloseDate={(date) =>
          void run(() => close(date), `${displayDate(date)} closed`)
        }
        onReopenDate={(date) =>
          void run(() => reopen(date), `${displayDate(date)} reopened`)
        }
      />
    </div>
  );
}

/**
 * The full Day Close history — every open date before today (each with
 * its own Close button) + the recently-closed table (each with Reopen).
 * `highlightDate` (from "Review day →") gets a subtle accent ring so the
 * admin can find the row they clicked through for.
 */
function DayCloseHistoryDrawer({
  open,
  onClose,
  openPriorDates,
  recent,
  highlightDate,
  busy,
  onCloseDate,
  onReopenDate,
}: {
  open: boolean;
  onClose: () => void;
  openPriorDates: string[];
  recent: DayCloseView[];
  highlightDate?: string | null;
  busy: boolean;
  onCloseDate: (date: string) => void;
  onReopenDate: (date: string) => void;
}) {
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
          onClick={() => onReopenDate(r.date)}
        >
          Reopen
        </Button>
      ),
    },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Day Close history" variant="rail">
      <div className="flex flex-col gap-(--sp-7)">
        <div className="flex flex-col gap-(--sp-3)">
          <h3 className="font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase [color:var(--text-tertiary)]">
            Open before today
          </h3>
          {openPriorDates.length === 0 ? (
            <p className="font-ui text-sm/sm [color:var(--text-secondary)]">
              Nothing open before today — you&apos;re caught up.
            </p>
          ) : (
            <div className="flex flex-col rounded-md overflow-clip border border-solid [border-color:var(--border-subtle)]">
              {openPriorDates.map((date, i) => (
                <div
                  key={date}
                  className={`flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) ${
                    i < openPriorDates.length - 1
                      ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                      : ""
                  } ${
                    date === highlightDate
                      ? "[background-color:var(--surface-subtle)] border-l-2 [border-left-color:var(--color-accent)]"
                      : ""
                  }`}
                >
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
                    {displayDate(date)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => onCloseDate(date)}
                    aria-label={`Close ${displayDate(date)}`}
                  >
                    Close
                  </Button>
                </div>
              ))}
            </div>
          )}
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
      </div>
    </Drawer>
  );
}

/**
 * Standalone page wrapper — kept for a direct mount / screen spec. The
 * live `/admin` route composes <DayCloseRow> into the dashboard instead
 * (M5-S14 / v2).
 */
export function DayCloseClient() {
  return (
    <PageShell>
      <AdminPageHeader title="Dashboard" />
      <DayCloseRow />
    </PageShell>
  );
}
