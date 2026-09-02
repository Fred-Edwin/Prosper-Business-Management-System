"use client";

// M3 S3 — the Handovers view: end-of-day cash / M-Pesa reconciliation for
// the business date chosen in the Financials toolbar. Rendered as the
// third inner tab of /admin/financials (no own date picker — `date` comes
// down as a prop; `isToday` gates the "Record receipt" action, since
// staff can only declare/receive for today, ADR-53. Admin corrections are
// not day-gated, so "Correct" stays available on any date).
//
// COMPOSED from the proven kit — no kit change:
//   • <SimpleTable> — ONE line per row: Staff · Location · Time · Status ·
//     Declared (c/m) · Received (c/m) · Variance (c/m) · action. The
//     shortfall note is a quiet second line under Status, not a stacked
//     pile in the Staff cell (that overflowed the fixed row height).
//   • a bespoke totals strip below (the kit <SimpleTable> has no footer).
//   • <ReceiptDrawer> / <HandoverCorrectionDrawer>, <EmptyState> /
//     <ErrorState>.
//
// Variance styling reuses the reconciliation vocabulary: exact = neutral,
// shortfall = the danger token, over = the success token. No new colours.

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import type { ReconciliationRow } from "@/lib/domain/handovers";
import { useReconciliation } from "./use-handovers";
import { ReceiptDrawer } from "./receipt-drawer";
import { HandoverCorrectionDrawer } from "./handover-correction-drawer";

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

/**
 * A money cell: two labelled lines — `Cash <n>` over `M-Pesa <n>` — right
 * aligned. Replaces the cramped "c / m" slash pair. `cashClass` /
 * `mpesaClass` colour the figure (variance column only).
 */
function Stack({
  cash,
  mpesa,
  cashClass,
  mpesaClass,
  muted = false,
}: {
  cash: string;
  mpesa: string;
  cashClass?: string;
  mpesaClass?: string;
  muted?: boolean;
}) {
  const base = muted
    ? "[color:var(--text-tertiary)]"
    : "[color:var(--text-primary)]";
  return (
    <span className="flex flex-col items-end gap-[1px] whitespace-nowrap">
      <span className="flex items-baseline gap-(--sp-3)">
        <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          Cash
        </span>
        <span className={`font-mono text-sm/sm ${cashClass ?? base}`}>{cash}</span>
      </span>
      <span className="flex items-baseline gap-(--sp-3)">
        <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
          M-Pesa
        </span>
        <span className={`font-mono text-sm/sm ${mpesaClass ?? base}`}>{mpesa}</span>
      </span>
    </span>
  );
}

// ── View ───────────────────────────────────────────────────────────────

export function HandoversView({
  date,
  isToday,
}: {
  /** `YYYY-MM-DD` business date from the Financials toolbar. */
  date: string;
  /** True when `date` is today (Africa/Nairobi) — gates "Record receipt". */
  isToday: boolean;
}) {
  const { data, loading, error, refresh, recordReceipt, correct } =
    useReconciliation(date);

  const [receiptRow, setReceiptRow] = React.useState<ReconciliationRow | null>(
    null,
  );
  const [correctRow, setCorrectRow] = React.useState<ReconciliationRow | null>(
    null,
  );

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const awaitingCount = rows.filter((r) => !r.received).length;

  const columns: SimpleTableColumn<ReconciliationRow>[] = [
    {
      key: "staff",
      header: "Staff",
      width: "w-[140px] shrink-0",
      render: (r) => (
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          {r.staffName}
        </span>
      ),
    },
    {
      key: "declared",
      header: "Declared",
      width: "w-[150px] shrink-0",
      align: "right",
      render: (r) => (
        <Stack cash={money(r.cashDeclared)} mpesa={money(r.mpesaDeclared)} />
      ),
    },
    {
      key: "received",
      header: "Received",
      width: "w-[150px] shrink-0",
      align: "right",
      render: (r) =>
        r.received ? (
          <Stack cash={money(r.cashReceived)} mpesa={money(r.mpesaReceived)} />
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">
            Not received
          </span>
        ),
    },
    {
      key: "variance",
      header: "Variance",
      width: "w-[150px] shrink-0",
      align: "right",
      render: (r) =>
        r.received ? (
          <Stack
            cash={fmtVariance(r.cashVariance)}
            mpesa={fmtVariance(r.mpesaVariance)}
            cashClass={`font-mono text-sm/sm ${VAR_CLASS[varianceTone(r.cashVariance)]}`}
            mpesaClass={`font-mono text-sm/sm ${VAR_CLASS[varianceTone(r.mpesaVariance)]}`}
          />
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[140px] shrink-0",
      render: (r) =>
        r.received ? (
          <StatusChip variant="success">Received</StatusChip>
        ) : (
          <StatusChip variant="warning">Awaiting receipt</StatusChip>
        ),
    },
    {
      key: "note",
      header: "Note",
      width: "grow basis-0 min-w-[160px]",
      render: (r) =>
        r.shortfallNotes.length > 0 ? (
          <span className="font-ui text-danger text-caption/caption">
            {r.shortfallNotes.join(" · ")}
          </span>
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">—</span>
        ),
    },
    {
      key: "action",
      header: "",
      width: "w-[130px] shrink-0",
      align: "right",
      render: (r) =>
        r.received ? (
          <Button variant="secondary" size="sm" onClick={() => setCorrectRow(r)}>
            Correct
          </Button>
        ) : isToday ? (
          <Button variant="primary" size="sm" onClick={() => setReceiptRow(r)}>
            Record receipt
          </Button>
        ) : (
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            Not received
          </span>
        ),
    },
  ];

  return (
    <div className="flex flex-col grow min-h-0 gap-(--sp-5) pt-(--sp-6)">
      {!loading && !error && rows.length > 0 && (
        <div className="font-ui [color:var(--text-secondary)] text-sm/sm px-(--sp-6) md:px-0">
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
      )}

      {error ? (
        <div className="px-(--sp-6) md:px-0">
          <ErrorState
            title="Couldn't load the handover reconciliation"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : !loading && rows.length === 0 ? (
        <div className="px-(--sp-6) md:px-0">
          <EmptyState
            title="No handovers for this date"
            description="Cash and M-Pesa handovers declared by cashiers and the canteen attendant on the selected day show up here for you to receive."
          />
        </div>
      ) : (
        <>
          {/* Desktop / tablet: the table + a totals strip. */}
          <div className="hidden md:flex flex-col overflow-x-auto">
            <SimpleTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.handoverId}
              loading={loading && rows.length === 0}
            />
            {totals && rows.length > 0 && <TotalsRow totals={totals} />}
          </div>

          {/* Mobile: stacked cards. */}
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
            ) : (
              rows.map((r) => (
                <MobileHandoverCard
                  key={r.handoverId}
                  row={r}
                  canReceive={isToday}
                  onRecordReceipt={() => setReceiptRow(r)}
                  onCorrect={() => setCorrectRow(r)}
                />
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
    </div>
  );
}

// ── Totals strip (desktop) — from the endpoint's pre-summed totals ──────

type Totals = NonNullable<
  ReturnType<typeof useReconciliation>["data"]
>["totals"];

function TotalsRow({ totals }: { totals: Totals }) {
  return (
    <div className="flex items-center min-h-[52px] px-[16px] gap-[16px] border-x border-b border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-subtle)]">
      <div className="w-[140px] shrink-0 font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
        Totals
      </div>
      <div className="w-[150px] shrink-0 flex justify-end">
        <Stack
          cash={money(totals.cashDeclared)}
          mpesa={money(totals.mpesaDeclared)}
        />
      </div>
      <div className="w-[150px] shrink-0 flex justify-end">
        <Stack
          cash={money(totals.cashReceived)}
          mpesa={money(totals.mpesaReceived)}
        />
      </div>
      <div className="w-[150px] shrink-0 flex justify-end">
        <Stack
          cash={fmtVariance(totals.cashVariance)}
          mpesa={fmtVariance(totals.mpesaVariance)}
          cashClass={`font-mono text-sm/sm ${VAR_CLASS[varianceTone(totals.cashVariance)]}`}
          mpesaClass={`font-mono text-sm/sm ${VAR_CLASS[varianceTone(totals.mpesaVariance)]}`}
        />
      </div>
      <div className="w-[140px] shrink-0" />
      <div className="grow basis-0 min-w-[160px]" />
      <div className="w-[130px] shrink-0" />
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
            {row.locationName} · {nairobiTime(row.occurredAt)}
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
