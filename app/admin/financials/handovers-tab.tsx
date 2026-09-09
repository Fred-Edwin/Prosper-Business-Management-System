"use client";

// M3 S3 — the Handovers view: cash / M-Pesa reconciliation for the
// business range chosen in the Financials range control. Rendered as the
// third inner tab of /admin/financials.
//
// ADR-79 (2026-09-09) widened this from a single-day worksheet to a real
// range: rows are grouped by their own Nairobi business day (a day
// sub-header + that day's rows + a per-day sub-total), so "This week" /
// "This month" show every handover in range instead of only the range's
// end day. "Record receipt" is gated per row on whether THAT row's day
// is closed (`data.closedDates`), not on whether the worksheet's overall
// range includes today — staff can only declare/receive on their own
// today, but an Admin may receive a still-open past day (the domain/API
// already allowed this; only the UI was blocking it). A "Record a
// handover" action lets the Admin back-enter a declaration a staff
// member missed (`recordHandoverForDate` — `RecordHandoverDrawer`).
//
// DESKTOP TABLE — bespoke, grouped (M3 S7 redesign, owner-approved v2:
// Paper "Prosper Hotel" · page "M3 S7 — Handovers table redesign").
//   • A two-row header: group labels (Declared / Received / Variance) over
//     Cash | M-Pesa sub-columns. ONE line per row — Cash and M-Pesa each
//     get their own narrow right-aligned column, nothing stacked.
//   • Columns: Date (92) · Staff (150) · Status pip (130) · Declared·Cash /
//     Declared·M-Pesa / Received·Cash / Received·M-Pesa / Variance·Cash /
//     Variance·M-Pesa (90 each) · Note (grow) · action (130). A hairline
//     `border-l` opens each of the three money groups + the Note column.
//     The Date column carries each row's own reconciled business day —
//     redundant within one day-group's rows, but keeps a row legible if
//     scrolled away from its group header.
//   • The kit <SimpleTable> has no grouped-header or footer support, so
//     this table is hand-built from token markup (the totals strip
//     already was). It is NOT a kit change — no kit file is touched.
//   • Mobile keeps the stacked cards, also day-grouped; <EmptyState> /
//     <ErrorState> and the <ReceiptDrawer> / <HandoverCorrectionDrawer>
//     are unchanged.
//
// Value styling: a real figure = --text-primary, an exact zero =
// --text-tertiary (so real numbers pop); a variance reuses the
// reconciliation vocabulary — exact/absent = neutral, shortfall = the
// danger token, over = the success token. No new colours.

import * as React from "react";
import { StatusChip } from "@/components/kit/status-chip";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import type { ReconciliationRow } from "@/lib/domain/handovers";
import { useRoster } from "../staff/use-staff";
import { useReconciliation } from "./use-handovers";
import { ReceiptDrawer } from "./receipt-drawer";
import { HandoverCorrectionDrawer } from "./handover-correction-drawer";
import { RecordHandoverDrawer } from "./record-handover-drawer";

// ── Display helpers ────────────────────────────────────────────────────

/** "5,000.00" from a "5000.00" decimal string; "—" for null. */
function money(dec: string | null): string {
  if (dec == null) return "—";
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

/** ISO → "2:14 PM" in Africa/Nairobi (mobile card only). */
function nairobiTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/**
 * ISO → the Africa/Nairobi business date a handover reconciles: `"6 Sep"`,
 * or `"6 Sep 2025"` when the row's year differs from the current one. Each
 * row carries its own day so the worksheet still reads correctly once it
 * holds rows from more than one day (a back-entered handover for an
 * earlier day shown next to today's).
 */
function nairobiDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const thisYear = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
  }).format(new Date());
  const year = get("year");
  return year === thisYear
    ? `${get("day")} ${get("month")}`
    : `${get("day")} ${get("month")} ${year}`;
}

/** ISO → the Africa/Nairobi business date as `YYYY-MM-DD` — the grouping
 * key (`nairobiDate` above is the display string, not sortable/comparable
 * as a key). */
function nairobiDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

type VarianceTone = "neutral" | "short" | "over";

function varianceTone(dec: string | null): VarianceTone {
  if (dec == null) return "neutral";
  const n = Number(dec);
  if (!Number.isFinite(n) || n === 0) return "neutral";
  return n < 0 ? "short" : "over";
}

const VAR_CLASS: Record<VarianceTone, string> = {
  neutral: "[color:var(--text-secondary)]",
  short: "text-danger",
  over: "text-success",
};

/** "+120.00" / "-500.00" / "0.00" — signed, 2dp. `null` → "—". */
function fmtVariance(dec: string | null): string {
  if (dec == null) return "—";
  const n = Number(dec);
  if (!Number.isFinite(n)) return dec;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

// ── Desktop grouped table (v2) — column geometry ──────────────────────
// Date 92 · Staff 150 · Status 130 · 6 money cols 90 each · Note grow ·
// action 130. A hairline `border-l` opens each money group and the Note
// column.

const COL = {
  date: "w-[92px] shrink-0",
  staff: "w-[150px] shrink-0",
  status: "w-[130px] shrink-0",
  money: "w-[90px] shrink-0",
  note: "grow basis-0 min-w-[160px]",
  action: "w-[130px] shrink-0",
} as const;
/** The left hairline that opens each of the three money groups + Note. */
const GROUP_EDGE = "border-l border-l-solid [border-left-color:var(--border-subtle)]";

/**
 * One right-aligned money figure in its own column. A real value reads
 * `--text-primary`; an exact zero is muted so real numbers pop; `tone`
 * colours a variance (short = danger, over = success). `groupStart` draws
 * the group's opening hairline + inset.
 */
function MoneyCell({
  value,
  tone,
  groupStart = false,
}: {
  value: string;
  tone?: VarianceTone;
  groupStart?: boolean;
}) {
  const isZeroish = value === "0.00" || value === "—";
  const color = tone
    ? VAR_CLASS[tone]
    : isZeroish
      ? "[color:var(--text-tertiary)]"
      : "[color:var(--text-primary)]";
  return (
    <div
      role="cell"
      className={`${COL.money} text-right font-mono ${color} text-sm/sm ${
        groupStart ? `${GROUP_EDGE} pl-(--sp-4)` : ""
      }`}
    >
      {value}
    </div>
  );
}

/**
 * The desktop status indicator — a coloured dot + a coloured label, no
 * pill background (owner call, M3 S7: the filled chip was too heavy in a
 * dense table). Success = "Received", warning = "Awaiting".
 */
function StatusPip({ received }: { received: boolean }) {
  const tone = received ? "text-success" : "text-warning";
  const dot = received ? "bg-success" : "bg-warning";
  return (
    <span
      className={`inline-flex items-center gap-(--sp-2) font-ui font-(--weight-medium) text-micro/micro ${tone}`}
    >
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${dot}`} />
      {received ? "Received" : "Awaiting"}
    </span>
  );
}

/** Two-row grouped header: group labels over Cash | M-Pesa sub-labels. */
function ReconTableHeader() {
  const groupLabel =
    "font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] text-info text-micro/micro";
  const subLabel =
    "font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-micro/micro text-right";
  return (
    <div className="flex flex-col bg-info-bg border-b border-b-solid [border-bottom-color:var(--border-strong)]">
      {/* Row 1 — group labels */}
      <div role="row" className="flex px-(--sp-7) pt-(--sp-4) pb-(--sp-2)">
        <div className={COL.date} />
        <div className={COL.staff} />
        <div className={COL.status} />
        {(["Declared", "Received", "Variance"] as const).map((g) => (
          <div
            key={g}
            role="columnheader"
            className={`w-[180px] shrink-0 flex justify-center ${GROUP_EDGE}`}
          >
            <span className={groupLabel}>{g}</span>
          </div>
        ))}
        <div className={`${COL.note} ${GROUP_EDGE}`} />
        <div className={COL.action} />
      </div>
      {/* Row 2 — Staff / Status + Cash | M-Pesa per group */}
      <div role="row" className="flex items-end px-(--sp-7) pb-(--sp-3)">
        <div role="columnheader" className={`${COL.date} ${groupLabel}`}>
          Date
        </div>
        <div role="columnheader" className={`${COL.staff} ${groupLabel}`}>
          Staff
        </div>
        <div role="columnheader" className={`${COL.status} ${groupLabel}`}>
          Status
        </div>
        {[0, 1, 2].map((g) => (
          <React.Fragment key={g}>
            <div
              role="columnheader"
              className={`${COL.money} ${subLabel} ${GROUP_EDGE} pl-(--sp-4)`}
            >
              Cash
            </div>
            <div role="columnheader" className={`${COL.money} ${subLabel}`}>
              M-Pesa
            </div>
          </React.Fragment>
        ))}
        <div
          role="columnheader"
          className={`${COL.note} ${GROUP_EDGE} pl-(--sp-5) text-center ${groupLabel}`}
        >
          Note
        </div>
        <div className={COL.action} />
      </div>
    </div>
  );
}

/** One handover row — one line, Cash / M-Pesa each in their own column. */
function ReconRow({
  row: r,
  dayClosed,
  onCorrect,
  onRecordReceipt,
}: {
  row: ReconciliationRow;
  /** True when the row's OWN business day (not the worksheet's range) is
   * sealed — the only thing that actually blocks a fresh receipt. */
  dayClosed: boolean;
  onCorrect: () => void;
  onRecordReceipt: () => void;
}) {
  const dash = "—";
  return (
    <div
      role="row"
      className="flex items-center min-h-[48px] px-(--sp-7) py-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
    >
      <div
        role="cell"
        className={`${COL.date} font-ui [color:var(--text-secondary)] text-sm/sm`}
      >
        {nairobiDate(r.occurredAt)}
      </div>
      <div
        role="cell"
        className={`${COL.staff} font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm`}
      >
        {r.staffName}
      </div>
      <div role="cell" className={COL.status}>
        <StatusPip received={r.received} />
      </div>

      {/* Declared — always present */}
      <MoneyCell value={money(r.cashDeclared)} groupStart />
      <MoneyCell value={money(r.mpesaDeclared)} />

      {/* Received */}
      <MoneyCell value={r.received ? money(r.cashReceived) : dash} groupStart />
      <MoneyCell value={r.received ? money(r.mpesaReceived) : dash} />

      {/* Variance */}
      <MoneyCell
        value={r.received ? fmtVariance(r.cashVariance) : dash}
        tone={r.received ? varianceTone(r.cashVariance) : undefined}
        groupStart
      />
      <MoneyCell
        value={r.received ? fmtVariance(r.mpesaVariance) : dash}
        tone={r.received ? varianceTone(r.mpesaVariance) : undefined}
      />

      <div
        role="cell"
        className={`${COL.note} ${GROUP_EDGE} pl-(--sp-5) ${
          r.shortfallNotes.length > 0 ? "" : "text-center"
        }`}
      >
        {r.shortfallNotes.length > 0 ? (
          <span className="font-ui text-danger text-caption/caption">
            {r.shortfallNotes.join(" · ")}
          </span>
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">
            {dash}
          </span>
        )}
      </div>

      <div role="cell" className={`${COL.action} flex justify-end`}>
        {r.received ? (
          <Button variant="secondary" size="sm" onClick={onCorrect}>
            Correct
          </Button>
        ) : dayClosed ? (
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Day closed
          </span>
        ) : (
          <Button variant="primary" size="sm" onClick={onRecordReceipt}>
            Record receipt
          </Button>
        )}
      </div>
    </div>
  );
}

/** Sub-header opening one day's group of rows in the day-grouped
 * worksheet: the day label + how many handovers + how many still await
 * receipt. Sits inside the table as its own `role="row"` so it scrolls
 * with the body but reads distinct from a data row. */
function DayGroupHeader({
  dayKey,
  count,
  awaitingCount,
}: {
  dayKey: string;
  count: number;
  awaitingCount: number;
}) {
  const label = nairobiDate(`${dayKey}T12:00:00.000Z`);
  return (
    <div
      role="row"
      className="flex items-center gap-(--sp-3) min-h-[36px] px-(--sp-7) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
    >
      <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-caption/micro">
        {label}
      </span>
      <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
        {count} {count === 1 ? "handover" : "handovers"}
        {awaitingCount > 0 && (
          <>
            {" · "}
            <span className="text-warning">{awaitingCount} awaiting</span>
          </>
        )}
      </span>
    </div>
  );
}

// ── Day grouping ───────────────────────────────────────────────────────

type DayGroup = { dayKey: string; rows: ReconciliationRow[] };

/** Bucket rows by their own Nairobi business day, in day order. Handovers
 * within a day are already chronological (`getReconciliation`'s query
 * order), which this preserves. */
function groupByDay(rows: ReconciliationRow[]): DayGroup[] {
  const byDay = new Map<string, ReconciliationRow[]>();
  for (const r of rows) {
    const key = nairobiDayKey(r.occurredAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(r);
    else byDay.set(key, [r]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayRows]) => ({ dayKey, rows: dayRows }));
}

// ── View ───────────────────────────────────────────────────────────────

export function HandoversView({
  from,
  to,
}: {
  /** Inclusive `YYYY-MM-DD` business-date range from the header control. */
  from: string;
  to: string;
}) {
  const { data, loading, error, refresh, recordReceipt, correct, recordBackdated } =
    useReconciliation({ from, to });
  const { staff: rosterStaff } = useRoster(null);

  const [receiptRow, setReceiptRow] = React.useState<ReconciliationRow | null>(
    null,
  );
  const [correctRow, setCorrectRow] = React.useState<ReconciliationRow | null>(
    null,
  );
  const [recording, setRecording] = React.useState(false);

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const closedDates = React.useMemo(
    () => new Set(data?.closedDates ?? []),
    [data?.closedDates],
  );
  const awaitingCount = rows.filter((r) => !r.received).length;
  const groups = React.useMemo(() => groupByDay(rows), [rows]);

  return (
    <div className="flex flex-col grow gap-(--sp-5) pt-(--sp-6) pb-(--sp-12)">
      <div className="flex items-center justify-between gap-(--sp-4) px-(--sp-6) md:px-0">
        {!loading && !error && rows.length > 0 ? (
          <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
            {rows.length} {rows.length === 1 ? "handover" : "handovers"}
            {awaitingCount > 0 ? (
              <>
                {" · "}
                <span className="text-warning font-(--weight-medium)">
                  {awaitingCount} awaiting receipt
                </span>
              </>
            ) : (
              " · all received"
            )}
          </div>
        ) : (
          <span />
        )}
        <Button variant="secondary" size="sm" onClick={() => setRecording(true)}>
          Record a handover
        </Button>
      </div>

      {error ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load the handover reconciliation"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : (
        <>
          {/* Desktop / tablet: the bespoke grouped table + a totals strip.
              The header is ALWAYS visible; an empty range renders the
              EmptyState in the body and the PAGE scrolls to it (no trapped
              inner strip). `overflow-x-auto` for horizontal scroll only,
              no `min-h-0` ancestor to clip height. Rows are bucketed into
              one DayGroupHeader + its rows per Nairobi business day. */}
          <div className="hidden md:flex flex-col overflow-x-auto">
            <div
              role="table"
              aria-label="Handover reconciliation"
              className="flex flex-col min-w-[1072px] rounded-sm overflow-clip bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]"
            >
              <ReconTableHeader />
              {loading && rows.length === 0 ? (
                [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    role="row"
                    className="flex items-center h-[48px] px-(--sp-7) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  >
                    <div className="kit-skeleton h-[14px] w-full rounded-sm" />
                  </div>
                ))
              ) : rows.length === 0 ? (
                <div className="p-(--sp-8)">
                  <EmptyState
                    title="No handovers in this range"
                    description="Cash and M-Pesa handovers declared by cashiers and the canteen attendant show up here for you to receive."
                  />
                </div>
              ) : (
                groups.map((g) => (
                  <React.Fragment key={g.dayKey}>
                    <DayGroupHeader
                      dayKey={g.dayKey}
                      count={g.rows.length}
                      awaitingCount={g.rows.filter((r) => !r.received).length}
                    />
                    {g.rows.map((r) => (
                      <ReconRow
                        key={r.handoverId}
                        row={r}
                        dayClosed={closedDates.has(g.dayKey)}
                        onCorrect={() => setCorrectRow(r)}
                        onRecordReceipt={() => setReceiptRow(r)}
                      />
                    ))}
                  </React.Fragment>
                ))
              )}
              {totals && rows.length > 0 && <TotalsRow totals={totals} />}
            </div>
          </div>

          {/* Mobile: stacked cards, same day grouping. */}
          <div className="flex md:hidden flex-col">
            {loading && rows.length === 0 ? (
              <div className="flex flex-col">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  >
                    <div className="kit-skeleton h-[14px] w-2/3 rounded-sm" />
                    <div className="kit-skeleton h-[12px] w-full rounded-sm" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-(--sp-5)">
                <EmptyState
                  title="No handovers in this range"
                  description="Cash and M-Pesa handovers declared by cashiers and the canteen attendant show up here for you to receive."
                />
              </div>
            ) : (
              groups.map((g) => (
                <React.Fragment key={g.dayKey}>
                  <DayGroupHeader
                    dayKey={g.dayKey}
                    count={g.rows.length}
                    awaitingCount={g.rows.filter((r) => !r.received).length}
                  />
                  {g.rows.map((r) => (
                    <MobileHandoverCard
                      key={r.handoverId}
                      row={r}
                      canReceive={!closedDates.has(g.dayKey)}
                      onRecordReceipt={() => setReceiptRow(r)}
                      onCorrect={() => setCorrectRow(r)}
                    />
                  ))}
                </React.Fragment>
              ))
            )}
            {totals && rows.length > 0 && <MobileTotals totals={totals} />}
          </div>
        </>
      )}

      {receiptRow && (
        <ReceiptDrawer
          row={receiptRow}
          recordReceipt={recordReceipt}
          onClose={() => setReceiptRow(null)}
        />
      )}
      {correctRow && (
        <HandoverCorrectionDrawer
          row={correctRow}
          correct={correct}
          onClose={() => setCorrectRow(null)}
        />
      )}
      {recording && (
        <RecordHandoverDrawer
          staff={rosterStaff}
          defaultDate={to}
          recordBackdated={recordBackdated}
          onClose={() => setRecording(false)}
        />
      )}
    </div>
  );
}

// ── Totals strip (desktop) — from the endpoint's pre-summed totals ──────

type Totals = NonNullable<
  ReturnType<typeof useReconciliation>["data"]
>["totals"];

function TotalsRow({ totals }: { totals: Totals }) {
  return (
    <div
      role="row"
      className="flex items-center min-h-[48px] px-(--sp-7) py-(--sp-3) [background-color:var(--surface-subtle)] border-t border-t-solid [border-top-color:var(--border-strong)]"
    >
      <div role="cell" className={COL.date} />
      <div
        role="cell"
        className={`${COL.staff} font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm`}
      >
        Totals
      </div>
      <div role="cell" className={COL.status} />
      <MoneyCell value={money(totals.cashDeclared)} groupStart />
      <MoneyCell value={money(totals.mpesaDeclared)} />
      <MoneyCell value={money(totals.cashReceived)} groupStart />
      <MoneyCell value={money(totals.mpesaReceived)} />
      <MoneyCell
        value={fmtVariance(totals.cashVariance)}
        tone={varianceTone(totals.cashVariance)}
        groupStart
      />
      <MoneyCell
        value={fmtVariance(totals.mpesaVariance)}
        tone={varianceTone(totals.mpesaVariance)}
      />
      <div role="cell" className={`${COL.note} ${GROUP_EDGE}`} />
      <div role="cell" className={COL.action} />
    </div>
  );
}

// ── Mobile card + totals ───────────────────────────────────────────────

function Figure({
  label,
  cash,
  mpesa,
  cashTone,
  mpesaTone,
}: {
  label: string;
  cash: string;
  mpesa: string;
  cashTone?: VarianceTone;
  mpesaTone?: VarianceTone;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-ui [color:var(--text-secondary)] text-sm/sm">
        {label}
      </span>
      <span className="font-mono text-sm/sm whitespace-nowrap">
        <span
          className={
            cashTone ? VAR_CLASS[cashTone] : "[color:var(--text-primary)]"
          }
        >
          {cash}
        </span>
        <span className="[color:var(--text-tertiary)]"> / </span>
        <span
          className={
            mpesaTone ? VAR_CLASS[mpesaTone] : "[color:var(--text-primary)]"
          }
        >
          {mpesa}
        </span>
      </span>
    </div>
  );
}

function MobileHandoverCard({
  row,
  canReceive,
  onRecordReceipt,
  onCorrect,
}: {
  row: ReconciliationRow;
  canReceive: boolean;
  onRecordReceipt: () => void;
  onCorrect: () => void;
}) {
  return (
    <div className="flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <div className="flex items-center justify-between gap-(--sp-4)">
        <div className="flex flex-col">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
            {row.staffName}
          </span>
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {row.locationName} · {nairobiDate(row.occurredAt)} ·{" "}
            {nairobiTime(row.occurredAt)}
          </span>
        </div>
        {row.received ? (
          <StatusChip variant="success">Received</StatusChip>
        ) : (
          <StatusChip variant="warning">Awaiting receipt</StatusChip>
        )}
      </div>

      <Figure
        label="Declared"
        cash={money(row.cashDeclared)}
        mpesa={money(row.mpesaDeclared)}
      />
      {row.received && (
        <>
          <Figure
            label="Received"
            cash={money(row.cashReceived)}
            mpesa={money(row.mpesaReceived)}
          />
          <Figure
            label="Variance"
            cash={fmtVariance(row.cashVariance)}
            mpesa={fmtVariance(row.mpesaVariance)}
            cashTone={varianceTone(row.cashVariance)}
            mpesaTone={varianceTone(row.mpesaVariance)}
          />
        </>
      )}

      {row.shortfallNotes.length > 0 && (
        <div className="font-ui text-danger text-caption/micro">
          {row.shortfallNotes.join(" · ")}
        </div>
      )}

      {row.received ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCorrect}
          className="mt-(--sp-2)"
        >
          Correct
        </Button>
      ) : canReceive ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onRecordReceipt}
          className="mt-(--sp-2)"
        >
          Record receipt
        </Button>
      ) : (
        <span className="font-ui [color:var(--text-tertiary)] text-caption/micro mt-(--sp-2)">
          Not received
        </span>
      )}
    </div>
  );
}

function MobileTotals({ totals }: { totals: Totals }) {
  return (
    <div className="flex flex-col p-(--sp-5) gap-(--sp-3) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
      <span className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-body/sm">
        Totals
      </span>
      <Figure
        label="Declared"
        cash={money(totals.cashDeclared)}
        mpesa={money(totals.mpesaDeclared)}
      />
      <Figure
        label="Received"
        cash={money(totals.cashReceived)}
        mpesa={money(totals.mpesaReceived)}
      />
      <Figure
        label="Variance"
        cash={fmtVariance(totals.cashVariance)}
        mpesa={fmtVariance(totals.mpesaVariance)}
        cashTone={varianceTone(totals.cashVariance)}
        mpesaTone={varianceTone(totals.mpesaVariance)}
      />
    </div>
  );
}
