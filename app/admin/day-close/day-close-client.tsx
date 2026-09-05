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
// is now a single full-width status+toggle row with no card chrome.
//
// v2.1 (owner follow-up, same session): the History drawer's first cut
// split "open" and "closed" dates into two visually different lists (a
// row-per-date with a Close button, vs. a SimpleTable with Reopen) for
// what's conceptually one action on one thing — a business date's status.
// Replaced with a single unified table, one row per day of the CURRENT
// business week (Mon–Sun, `businessWeekRange`) — "Business date" /
// "Status", the status cell itself a <ToggleSwitch> (checked = closed),
// so closing and reopening are the same gesture regardless of which
// direction a given day currently is. A day after today is shown but its
// toggle is disabled (nothing to close yet). `openPriorDates` /
// `highlightDate` still exist for days OLDER than the current week (the
// Needs-attention "Review day →" case) — those render as extra rows
// above the week table, not folded into it, since they're a different
// week entirely and the table's week-scoping would otherwise hide them.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { ToggleSwitch } from "@/components/kit/toggle-switch";
import { Drawer } from "@/components/kit/drawer";
import { ErrorState } from "@/components/kit/error-state";
import { Spinner } from "@/components/kit/spinner";
import { StatusChip } from "@/components/kit/status-chip";
import { useToast } from "@/components/kit/toast";
import type { DayCloseView } from "@/lib/domain/audit";
import { addBusinessDays, businessWeekRange } from "@/lib/time";
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
        today={today}
        openPriorDates={openPriorDates}
        recent={recent}
        highlightDate={highlightDate}
        busy={busy}
        onToggleDate={(date, next) =>
          void run(
            () => (next ? close(date) : reopen(date)),
            `${displayDate(date)} ${next ? "closed" : "reopened"}`,
          )
        }
      />
    </div>
  );
}

type DayRowStatus = {
  date: string;
  closed: boolean;
  closedAt: string | null;
  /** Disable the toggle for a date that hasn't happened yet. */
  future: boolean;
};

/**
 * The full Day Close history: one row per day of the CURRENT business
 * week (Mon–Sun) — "Business date" / a status toggle — plus, above it,
 * any OLDER open dates the Needs-attention zone flagged (a different week
 * entirely, so not folded into the week table's own rows).
 * `highlightDate` (from "Review day →") gets a subtle accent left-border
 * so the admin can find the row they clicked through for.
 */
function DayCloseHistoryDrawer({
  open,
  onClose,
  today,
  openPriorDates,
  recent,
  highlightDate,
  busy,
  onToggleDate,
}: {
  open: boolean;
  onClose: () => void;
  today: { date: string; closed: boolean; closedAt: string | null } | null;
  openPriorDates: string[];
  recent: DayCloseView[];
  highlightDate?: string | null;
  busy: boolean;
  onToggleDate: (date: string, next: boolean) => void;
}) {
  const closedByDate = React.useMemo(
    () => new Map(recent.map((r) => [r.date, r.closedAt])),
    [recent],
  );

  const weekRows: DayRowStatus[] = React.useMemo(() => {
    if (!today) return [];
    const { from, to } = businessWeekRange(today.date);
    const rows: DayRowStatus[] = [];
    for (let d = from; d <= to; d = addBusinessDays(d, 1)) {
      if (d === today.date) {
        rows.push({ date: d, closed: today.closed, closedAt: today.closedAt, future: false });
      } else {
        const closedAt = closedByDate.get(d) ?? null;
        rows.push({ date: d, closed: closedAt !== null, closedAt, future: d > today.date });
      }
    }
    return rows;
  }, [today, closedByDate]);

  // Older open dates (outside this week) the Needs-attention zone flagged
  // — the week table above is scoped to Mon–Sun, so a stray earlier week
  // still needs its own affordance here.
  const weekDates = new Set(weekRows.map((r) => r.date));
  const olderOpenDates = openPriorDates.filter((d) => !weekDates.has(d));

  return (
    <Drawer open={open} onClose={onClose} title="Day Close history" variant="rail">
      <div className="flex flex-col gap-(--sp-7)">
        {olderOpenDates.length > 0 && (
          <div className="flex flex-col gap-(--sp-3)">
            <h3 className="font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase [color:var(--text-tertiary)]">
              Open before this week
            </h3>
            <DayCloseTable
              rows={olderOpenDates.map((date) => ({
                date,
                closed: false,
                closedAt: null,
                future: false,
              }))}
              highlightDate={highlightDate}
              busy={busy}
              onToggleDate={onToggleDate}
            />
          </div>
        )}

        <div className="flex flex-col gap-(--sp-3)">
          <h3 className="font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase [color:var(--text-tertiary)]">
            This week
          </h3>
          <DayCloseTable
            rows={weekRows}
            highlightDate={highlightDate}
            busy={busy}
            onToggleDate={onToggleDate}
          />
        </div>
      </div>
    </Drawer>
  );
}

/** One table, one row per business date — "Business date" / a status
 *  toggle (checked = closed). Shared by the week table and the
 *  older-open-dates section above it. */
function DayCloseTable({
  rows,
  highlightDate,
  busy,
  onToggleDate,
}: {
  rows: DayRowStatus[];
  highlightDate?: string | null;
  busy: boolean;
  onToggleDate: (date: string, next: boolean) => void;
}) {
  return (
    <div className="flex flex-col rounded-md overflow-clip border border-solid [border-color:var(--border-subtle)]">
      <div className="flex items-center py-(--sp-3) px-(--sp-5) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="grow font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Business date
        </div>
        <div className="shrink-0 font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro">
          Status
        </div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.date}
          className={`flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) ${
            i < rows.length - 1
              ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              : ""
          } ${
            r.date === highlightDate
              ? "[background-color:var(--surface-subtle)] border-l-2 [border-left-color:var(--color-accent)]"
              : ""
          }`}
        >
          <div className="flex flex-col gap-[2px]">
            <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
              {displayDate(r.date)}
            </span>
            {r.closed && r.closedAt && (
              <span className="font-ui text-caption/micro [color:var(--text-tertiary)]">
                {displayDateTime(r.closedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-(--sp-4) shrink-0">
            <StatusChip variant={r.future ? "neutral" : r.closed ? "neutral" : "success"}>
              {r.future ? "Not yet" : r.closed ? "Closed" : "Open"}
            </StatusChip>
            <ToggleSwitch
              checked={r.closed}
              disabled={busy || r.future}
              onChange={(next) => onToggleDate(r.date, next)}
              aria-label={
                r.closed ? `Reopen ${displayDate(r.date)}` : `Close ${displayDate(r.date)}`
              }
            />
          </div>
        </div>
      ))}
    </div>
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
