"use client";

// M5 S15 — `/admin/audit-trail`. Approved design: Paper "Prosper Hotel" ·
// page "M5 — Dashboard & Audit", `Audit trail — desktop [M5]` +
// `Audit trail — mobile [M5]`. Spec: docs/design/flows/audit-screen.md.
//
// A searchable log of who did what: actor · action · what was touched ·
// when · what changed. Admin-only. This table only grows, so it is
// PAGINATED (not infinite scroll) and DEFAULTS to a significant subset
// (corrections, deletions, day close/reopen, staff & payout writes) — a
// "Show everything" toggle drops the restriction (logins then appear).
//
// Composed from components/kit/* only: <PageShell>, <AdminPageHeader>,
// <FilterToolbar> (four <Select> controls + the <ToggleSwitch>), and the
// Financials table language — a bordered <div> grid with the info-bg
// uppercase header, hairline rows, plain coloured status text. The one
// thing the kit has no answer for is the expanded FIELD/WAS/NOW
// mini-table — a plain bordered <div> grid built in this file, re-using
// the profit-stack / payout-calc visual language (audit-screen.md §"What
// the kit couldn't express").
//
// Batch rows (ADR-65): where the API returns a `"batch"` item — several
// AuditLog rows written in one transaction (a multi-line purchase
// receipt) — it renders as ONE summary row ("6 items received · Store ·
// 9:14am") that expands to the individual rows. A `"single"` stays a
// plain row.

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import { ErrorState } from "@/components/kit/error-state";
import { EmptyState } from "@/components/kit/empty-state";
import type { AuditAction } from "@prisma/client";
import type { AuditLogEntryView, AuditLogItem } from "@/lib/domain/audit";
import {
  useAuditTrail,
  type AuditFilter,
} from "./use-audit-trail";
import {
  actionLabel,
  actionTone,
  entityDisplay,
  summarise,
  resolveFields,
  type ChangeField,
  batchSummary,
  fmtWhen,
} from "./audit-format";

const PAGE_SIZE = 50;

// ── Date presets (audit-screen.md — the Date control) ──────────────────
// The kit FilterToolbar's `kind:"date"` only bridges a single day; the
// design wants presets. Modelled as a `kind:"select"` — the honest kit
// fit. A fully custom range is deferred (flagged in the session report).

type DatePresetKey = "today" | "7d" | "30d" | "month";
const DATE_PRESETS: { value: DatePresetKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
];

/** Africa/Nairobi "today" as YYYY-MM-DD (day boundary is the fixed constant). */
function nairobiTodayISO(): string {
  // toLocaleDateString with the tz gives us the wall-clock date in Nairobi.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA → "YYYY-MM-DD"
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function presetRange(key: DatePresetKey): { from: string; to: string } {
  const today = nairobiTodayISO();
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysISO(today, -6), to: today };
    case "30d":
      return { from: addDaysISO(today, -29), to: today };
    case "month": {
      const [y, m] = today.split("-");
      return { from: `${y}-${m}-01`, to: today };
    }
  }
}

// ── Action / Entity option lists (confirmed against the enum) ──────────

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "create", label: "Created" },
  { value: "correct", label: "Corrected" },
  // soft_delete + hard_delete both label "Deleted"; the filter sends one.
  { value: "soft_delete", label: "Deleted" },
  { value: "day_close", label: "Day closed" },
  { value: "day_reopen", label: "Day reopened" },
  { value: "login", label: "Signed in" },
];

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "order", label: "Order" },
  { value: "stock_movement", label: "Stock movement" },
  { value: "stock_count", label: "Stock count" },
  { value: "handover", label: "Handover" },
  { value: "receipt_of_handover", label: "Receipt" },
  { value: "expense", label: "Expense" },
  { value: "owner_transaction", label: "Owner transaction" },
  { value: "repayment", label: "Repayment" },
  { value: "staff", label: "Staff" },
  { value: "staff_payout", label: "Staff payout" },
  { value: "staff_pay_adjustment", label: "Pay adjustment" },
  { value: "location", label: "Location" },
  { value: "product", label: "Product" },
  { value: "asset", label: "Asset" },
  { value: "customer", label: "Customer" },
  { value: "day_close", label: "Day" },
  { value: "user", label: "User" },
];

// ── The value-change mini-table (kit has no component — audit-screen.md) ──

function ChangeDetail({
  entry,
}: {
  entry: AuditLogEntryView;
}) {
  const fields = resolveFields(entry);

  if (fields) {
    return (
      <div className="flex pb-(--sp-6) pl-(--sp-8) pr-(--sp-4)">
        <div className="w-full md:w-[640px] flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]">
          {/* FIELD / WAS / NOW header */}
          <div className="hidden md:flex items-center py-(--sp-3) px-(--sp-5) [background-color:var(--surface-subtle)] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <span className="w-[180px] shrink-0 font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-[10px]/[12px]">
              Field
            </span>
            <span className="w-[180px] shrink-0 text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-[10px]/[12px]">
              Was
            </span>
            <span className="grow text-right font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-[10px]/[12px]">
              Now
            </span>
          </div>
          {fields.map((f, i) => (
            <FieldRow key={f.label} field={f} last={i === fields.length - 1} />
          ))}
        </div>
      </div>
    );
  }

  // Fallback — the JSON doesn't reduce to field/scalar pairs. Raw
  // Before / After blocks, the entity type + id above them. Never a
  // coloured pretty-diff.
  return (
    <div className="flex pb-(--sp-6) pl-(--sp-8) pr-(--sp-4)">
      <div className="w-full md:w-[640px] flex flex-col gap-(--sp-4) rounded-md border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)] py-(--sp-5) px-(--sp-5)">
        <span className="font-mono [color:var(--text-tertiary)] text-caption/caption">
          {entry.entityType} #{entry.entityId}
        </span>
        <RawBlock label="Before" value={entry.oldValue} />
        <RawBlock label="After" value={entry.newValue} />
      </div>
    </div>
  );
}

function FieldRow({ field, last }: { field: ChangeField; last: boolean }) {
  const valueCls =
    field.kind === "number" ? "font-mono" : "font-ui";
  return (
    <>
      {/* Desktop: label · was · now on one line. */}
      <div
        className={`hidden md:flex items-center py-(--sp-4) px-(--sp-5) ${
          last ? "" : "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
        }`}
      >
        <span className="w-[180px] shrink-0 font-ui [color:var(--text-secondary)] text-sm/sm">
          {field.label}
        </span>
        <span
          className={`w-[180px] shrink-0 text-right [color:var(--text-tertiary)] text-sm/sm ${valueCls}`}
        >
          {field.was}
        </span>
        <span
          className={`grow text-right font-(--weight-medium) [color:var(--text-primary)] text-sm/sm ${valueCls}`}
        >
          {field.now}
        </span>
      </div>
      {/* Mobile: label left, `was → now` right. */}
      <div
        className={`md:hidden flex items-baseline justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-5) ${
          last ? "" : "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
        }`}
      >
        <span className="shrink-0 font-ui [color:var(--text-secondary)] text-sm/sm">
          {field.label}
        </span>
        <span className={`text-right text-sm/sm ${valueCls}`}>
          <span className="[color:var(--text-tertiary)]">{field.was}</span>
          <span className="[color:var(--text-tertiary)]"> → </span>
          <span className="font-(--weight-medium) [color:var(--text-primary)]">
            {field.now}
          </span>
        </span>
      </div>
    </>
  );
}

function RawBlock({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="flex flex-col gap-(--sp-2)">
      <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-[10px]/[12px]">
        {label}
      </span>
      <pre className="font-mono [color:var(--text-secondary)] text-caption/caption whitespace-pre-wrap break-words m-0">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

// ── Rows ──────────────────────────────────────────────────────────────

const CHEVRON_DOWN = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CHEVRON_RIGHT = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Does this entry have a detail worth a chevron? Trivial rows (day_close,
 *  day_reopen with no field diff) don't. */
function hasDetail(entry: AuditLogEntryView): boolean {
  if (entry.action === "day_close" || entry.action === "day_reopen") return false;
  const fields = resolveFields(entry);
  if (fields && fields.length > 0) return true;
  // Fallback (raw JSON) is still worth expanding if there's any payload.
  return entry.oldValue != null || entry.newValue != null;
}

const CELL_WHEN = "w-[150px] shrink-0 font-mono [color:var(--text-secondary)] text-caption/caption";
const CELL_ACTOR = "w-[140px] shrink-0 font-ui [color:var(--text-primary)] text-sm/sm";
const CELL_ACTION = "w-[110px] shrink-0";
const CELL_TOUCHED = "w-[200px] shrink-0 text-sm/sm";
const CELL_CHANGE = "grow font-ui [color:var(--text-primary)] text-sm/sm min-w-0";
const CELL_CHEVRON = "w-[32px] shrink-0 flex justify-center";

function TouchedCell({ entry }: { entry: AuditLogEntryView }) {
  const d = entityDisplay(entry);
  if (d.href) {
    return (
      <Link
        href={d.href}
        onClick={(e) => e.stopPropagation()}
        className={`${CELL_TOUCHED} font-ui font-(--weight-medium) text-accent no-underline hover:underline truncate`}
      >
        {d.label}
      </Link>
    );
  }
  return (
    <span
      className={`${CELL_TOUCHED} ${
        d.mono
          ? "font-mono [color:var(--text-secondary)] text-micro/micro"
          : "font-ui [color:var(--text-secondary)]"
      } truncate`}
    >
      {d.label}
    </span>
  );
}

function ActionCell({ action }: { action: AuditAction }) {
  return (
    <span className={CELL_ACTION}>
      <span
        className={`font-ui font-(--weight-medium) text-caption/caption ${actionTone(action)}`}
      >
        {actionLabel(action)}
      </span>
    </span>
  );
}

/** A `"single"` item — a plain row (+ optional inline expansion). */
function SingleRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditLogEntryView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detail = hasDetail(entry);
  const Row = (
    <div
      role="row"
      aria-label={detail ? `${actionLabel(entry.action)} — ${entityDisplay(entry).label}` : undefined}
      tabIndex={detail ? 0 : undefined}
      onClick={detail ? onToggle : undefined}
      onKeyDown={
        detail
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      className={`flex items-center py-(--sp-5) px-(--sp-4) ${
        detail ? "kit-row kit-focus-ring cursor-pointer" : ""
      }`}
    >
      <span className={CELL_WHEN}>{fmtWhen(entry.occurredAt)}</span>
      <span className={CELL_ACTOR}>{entry.actorName}</span>
      <ActionCell action={entry.action} />
      <TouchedCell entry={entry} />
      <span className={CELL_CHANGE}>
        <span className="block truncate">{summarise(entry)}</span>
      </span>
      <span className={CELL_CHEVRON}>
        {detail ? (expanded ? CHEVRON_DOWN : CHEVRON_RIGHT) : null}
      </span>
    </div>
  );

  return (
    <div
      className={`border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
        expanded ? "[background-color:var(--surface-subtle)]" : ""
      }`}
    >
      {Row}
      {detail && expanded ? <ChangeDetail entry={entry} /> : null}
    </div>
  );
}

/** A `"batch"` item — one summary row that expands to the member rows. */
function BatchRow({
  item,
  expanded,
  onToggle,
  expandedChild,
  onToggleChild,
}: {
  item: Extract<AuditLogItem, { kind: "batch" }>;
  expanded: boolean;
  onToggle: () => void;
  expandedChild: string | null;
  onToggleChild: (id: string) => void;
}) {
  return (
    <div
      className={`border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
        expanded ? "[background-color:var(--surface-subtle)]" : ""
      }`}
    >
      <div
        role="row"
        aria-label={`${batchSummary(item)} — ${item.count} rows`}
        aria-expanded={expanded}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex items-center py-(--sp-5) px-(--sp-4) kit-row kit-focus-ring cursor-pointer"
      >
        <span className={CELL_WHEN}>{fmtWhen(item.occurredAt)}</span>
        <span className={CELL_ACTOR}>{item.actorName}</span>
        <ActionCell action={item.action} />
        <span
          className={`${CELL_TOUCHED} font-ui [color:var(--text-secondary)] truncate`}
        >
          {item.entityType
            ? ENTITY_OPTIONS.find((o) => o.value === item.entityType)?.label ??
              item.entityType
            : "Mixed"}
        </span>
        <span className={CELL_CHANGE}>
          <span className="block truncate font-(--weight-medium)">
            {batchSummary(item)}
          </span>
        </span>
        <span className={CELL_CHEVRON}>{expanded ? CHEVRON_DOWN : CHEVRON_RIGHT}</span>
      </div>

      {expanded ? (
        <div className="pb-(--sp-4) pl-(--sp-8) pr-(--sp-4)">
          <div className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]">
            {item.entries.map((e, i) => {
              const childDetail = hasDetail(e);
              const childOpen = expandedChild === e.id;
              return (
                <div
                  key={e.id}
                  className={
                    i < item.entries.length - 1
                      ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                      : ""
                  }
                >
                  <div
                    role="row"
                    aria-label={childDetail ? `Line — ${entityDisplay(e).label}` : undefined}
                    tabIndex={childDetail ? 0 : undefined}
                    onClick={childDetail ? () => onToggleChild(e.id) : undefined}
                    onKeyDown={
                      childDetail
                        ? (ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              onToggleChild(e.id);
                            }
                          }
                        : undefined
                    }
                    className={`flex items-center py-(--sp-4) px-(--sp-5) ${
                      childDetail ? "kit-row kit-focus-ring cursor-pointer" : ""
                    }`}
                  >
                    <span className="w-[132px] shrink-0 font-mono [color:var(--text-tertiary)] text-caption/caption">
                      {fmtWhen(e.occurredAt, "time")}
                    </span>
                    <span className="w-[220px] shrink-0 font-ui [color:var(--text-secondary)] text-sm/sm truncate">
                      {entityDisplay(e).label}
                    </span>
                    <span className="grow font-ui [color:var(--text-primary)] text-sm/sm min-w-0">
                      <span className="block truncate">{summarise(e)}</span>
                    </span>
                    <span className="w-[24px] shrink-0 flex justify-center">
                      {childDetail ? (childOpen ? CHEVRON_DOWN : CHEVRON_RIGHT) : null}
                    </span>
                  </div>
                  {childDetail && childOpen ? <ChangeDetail entry={e} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Mobile cards (audit-screen.md §"Mobile" — the row becomes a card) ──

/** action + entity + timestamp on the first line, summary below, actor
 *  below that; the expansion is the same bordered box, one line per
 *  field. */
function SingleCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditLogEntryView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detail = hasDetail(entry);
  const d = entityDisplay(entry);
  return (
    <div
      className={`border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
        expanded ? "[background-color:var(--surface-subtle)]" : ""
      }`}
    >
      <div
        role="row"
        aria-label={detail ? `${actionLabel(entry.action)} — ${d.label}` : undefined}
        tabIndex={detail ? 0 : undefined}
        onClick={detail ? onToggle : undefined}
        onKeyDown={
          detail
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        className={`flex flex-col gap-(--sp-2) py-(--sp-5) px-(--sp-5) ${
          detail ? "kit-row kit-focus-ring cursor-pointer" : ""
        }`}
      >
        <div className="flex items-baseline gap-(--sp-3)">
          <span
            className={`shrink-0 font-ui font-(--weight-medium) text-caption/caption ${actionTone(entry.action)}`}
          >
            {actionLabel(entry.action)}
          </span>
          <span className="grow font-ui [color:var(--text-secondary)] text-caption/caption truncate">
            {d.href ? (
              <Link
                href={d.href}
                onClick={(e) => e.stopPropagation()}
                className="font-(--weight-medium) text-accent no-underline"
              >
                {d.label}
              </Link>
            ) : (
              <span className={d.mono ? "font-mono text-micro/micro" : ""}>{d.label}</span>
            )}
          </span>
          <span className="shrink-0 font-mono [color:var(--text-tertiary)] text-micro/micro">
            {fmtWhen(entry.occurredAt)}
          </span>
        </div>
        <span className="font-ui [color:var(--text-primary)] text-sm/sm">
          {summarise(entry)}
        </span>
        <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
          {entry.actorName}
        </span>
      </div>
      {detail && expanded ? <ChangeDetail entry={entry} /> : null}
    </div>
  );
}

function BatchCard({
  item,
  expanded,
  onToggle,
  expandedChild,
  onToggleChild,
}: {
  item: Extract<AuditLogItem, { kind: "batch" }>;
  expanded: boolean;
  onToggle: () => void;
  expandedChild: string | null;
  onToggleChild: (id: string) => void;
}) {
  const entityLabel = item.entityType
    ? ENTITY_OPTIONS.find((o) => o.value === item.entityType)?.label ?? item.entityType
    : "Mixed";
  return (
    <div
      className={`border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
        expanded ? "[background-color:var(--surface-subtle)]" : ""
      }`}
    >
      <div
        role="row"
        aria-label={`${batchSummary(item)} — ${item.count} rows`}
        aria-expanded={expanded}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex flex-col gap-(--sp-2) py-(--sp-5) px-(--sp-5) kit-row kit-focus-ring cursor-pointer"
      >
        <div className="flex items-baseline gap-(--sp-3)">
          <span
            className={`font-ui font-(--weight-medium) text-caption/caption ${actionTone(item.action)}`}
          >
            {actionLabel(item.action)}
          </span>
          <span className="grow font-ui [color:var(--text-secondary)] text-caption/caption truncate">
            {entityLabel}
          </span>
          <span className="shrink-0 font-mono [color:var(--text-tertiary)] text-micro/micro">
            {fmtWhen(item.occurredAt)}
          </span>
          <span className="shrink-0">{expanded ? CHEVRON_DOWN : CHEVRON_RIGHT}</span>
        </div>
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm">
          {batchSummary(item)}
        </span>
        <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
          {item.actorName}
        </span>
      </div>
      {expanded ? (
        <div className="pb-(--sp-4) px-(--sp-5)">
          <div className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] [background-color:var(--surface-page)]">
            {item.entries.map((e, i) => {
              const childDetail = hasDetail(e);
              const childOpen = expandedChild === e.id;
              return (
                <div
                  key={e.id}
                  className={
                    i < item.entries.length - 1
                      ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                      : ""
                  }
                >
                  <div
                    role="row"
                    aria-label={childDetail ? `Line — ${entityDisplay(e).label}` : undefined}
                    tabIndex={childDetail ? 0 : undefined}
                    onClick={childDetail ? () => onToggleChild(e.id) : undefined}
                    onKeyDown={
                      childDetail
                        ? (ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              onToggleChild(e.id);
                            }
                          }
                        : undefined
                    }
                    className={`flex flex-col gap-(--sp-1) py-(--sp-4) px-(--sp-4) ${
                      childDetail ? "kit-row kit-focus-ring cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex items-baseline gap-(--sp-3)">
                      <span className="grow font-ui [color:var(--text-secondary)] text-caption/caption truncate">
                        {entityDisplay(e).label}
                      </span>
                      <span className="shrink-0 font-mono [color:var(--text-tertiary)] text-micro/micro">
                        {fmtWhen(e.occurredAt, "time")}
                      </span>
                      {childDetail ? (
                        <span className="shrink-0">
                          {childOpen ? CHEVRON_DOWN : CHEVRON_RIGHT}
                        </span>
                      ) : null}
                    </div>
                    <span className="font-ui [color:var(--text-primary)] text-sm/sm">
                      {summarise(e)}
                    </span>
                  </div>
                  {childDetail && childOpen ? <ChangeDetail entry={e} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── The screen ────────────────────────────────────────────────────────

export function AuditTrailClient({
  initial,
}: {
  initial?: Partial<Pick<AuditFilter, "action" | "from" | "to">>;
}) {
  const [datePreset, setDatePreset] = React.useState<DatePresetKey>(
    initial?.from ? "today" : "7d",
  );
  const [actorId, setActorId] = React.useState<string>("all");
  const [action, setAction] = React.useState<string>(initial?.action ?? "all");
  const [entityType, setEntityType] = React.useState<string>("all");
  const [showEverything, setShowEverything] = React.useState(false);
  const [page, setPage] = React.useState(0);

  // The Dashboard's "Correction today →" link lands here with
  // ?action=correct&from=<today>&to=<today>. Honour an explicit range.
  const range = React.useMemo(() => {
    if (initial?.from && initial?.to) return { from: initial.from, to: initial.to };
    return presetRange(datePreset);
  }, [initial?.from, initial?.to, datePreset]);

  const filter: AuditFilter = React.useMemo(
    () => ({
      from: range.from,
      to: range.to,
      actorId: actorId === "all" ? undefined : actorId,
      action: action === "all" ? undefined : (action as AuditAction),
      entityType: entityType === "all" ? undefined : entityType,
      significant: !showEverything,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [range, actorId, action, entityType, showEverything, page],
  );

  const { data, loading, error, refresh } = useAuditTrail(filter);

  // Any filter change → back to page 1.
  const resetPage = React.useCallback(() => setPage(0), []);

  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [expandedChild, setExpandedChild] = React.useState<string | null>(null);
  // Collapse expansions whenever the underlying query changes.
  React.useEffect(() => {
    setExpanded(null);
    setExpandedChild(null);
  }, [data]);
  const toggleItem = React.useCallback(
    (id: string) => setExpanded((cur) => (cur === id ? null : id)),
    [],
  );
  const toggleChild = React.useCallback(
    (id: string) => setExpandedChild((cur) => (cur === id ? null : id)),
    [],
  );

  const actorOptions = React.useMemo(
    () => [
      { value: "all", label: "All" },
      ...(data?.actors ?? []).map((a) => ({ value: a.id, label: a.name })),
    ],
    [data?.actors],
  );

  const controls: FilterControl[] = [
    {
      id: "date",
      label: "Date",
      kind: "select",
      options: DATE_PRESETS,
      value: datePreset,
      default: "7d",
    },
    {
      id: "actor",
      label: "Actor",
      kind: "select",
      options: actorOptions,
      value: actorId,
      default: "all",
    },
    {
      id: "action",
      label: "Action",
      kind: "select",
      options: ACTION_OPTIONS,
      value: action,
      default: "all",
    },
    {
      id: "entity",
      label: "Entity",
      kind: "select",
      options: ENTITY_OPTIONS,
      value: entityType,
      default: "all",
    },
    {
      id: "everything",
      label: "Show everything",
      kind: "toggle",
      value: showEverything,
      default: false,
    },
  ];

  const onFilterChange = React.useCallback(
    (id: string, value: string | boolean | null) => {
      resetPage();
      if (id === "date") setDatePreset(value as DatePresetKey);
      else if (id === "actor") setActorId(value as string);
      else if (id === "action") setAction(value as string);
      else if (id === "entity") setEntityType(value as string);
      else if (id === "everything") setShowEverything(Boolean(value));
    },
    [resetPage],
  );

  const onReset = React.useCallback(() => {
    resetPage();
    setDatePreset("7d");
    setActorId("all");
    setAction("all");
    setEntityType("all");
    setShowEverything(false);
  }, [resetPage]);

  const total = data?.page.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);

  const entriesWord = total === 1 ? "entry" : "entries";
  const resultLineFull = showEverything
    ? `Showing all activity · ${total} ${entriesWord}`
    : `Showing significant changes — corrections, deletions, day close & reopen, staff & location changes, payouts · ${total} ${entriesWord}`;
  // Mobile trims the long sentence (audit-screen.md §"Mobile").
  const resultLineShort = showEverything
    ? `All activity · ${total} ${entriesWord}`
    : `Significant changes only · ${total} ${entriesWord}`;

  return (
    <PageShell>
      <AdminPageHeader title="Audit trail" />

      <div className="flex flex-col grow gap-(--sp-5)">
        <FilterToolbar
          aria-label="Filter the audit trail"
          controls={controls}
          onChange={onFilterChange}
          onReset={onReset}
          resultCount={total}
          resultNoun="entries"
        />
        <p
          aria-live="polite"
          className="-mt-(--sp-3) px-(--sp-5) md:px-0 font-ui [color:var(--text-tertiary)] text-caption/caption"
        >
          <span className="hidden md:inline">{resultLineFull}</span>
          <span className="md:hidden">{resultLineShort}</span>
        </p>

        {error ? (
          <ErrorState
            title="Couldn't load the audit trail"
            description={error}
            onRetry={refresh}
          />
        ) : (
          <>
            {/* Desktop: the Financials table language. */}
            <div
              role="table"
              className="hidden md:flex flex-col border border-solid [border-color:var(--border-subtle)] [font-synthesis:none] antialiased"
            >
              {/* Head */}
              <div
                role="row"
                className="flex items-center py-(--sp-3) px-(--sp-4) [background-color:var(--surface-subtle)] border-b border-b-solid border-b-gray-600"
              >
                <span className={`${CELL_WHEN} font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--color-info)] text-[11px]/[16px]`}>
                  When
                </span>
                <span className={`w-[140px] shrink-0 font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--color-info)] text-[11px]/[16px]`}>
                  Actor
                </span>
                <span className={`w-[110px] shrink-0 font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--color-info)] text-[11px]/[16px]`}>
                  Action
                </span>
                <span className={`w-[200px] shrink-0 font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--color-info)] text-[11px]/[16px]`}>
                  What was touched
                </span>
                <span className="grow font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--color-info)] text-[11px]/[16px]">
                  Change
                </span>
                <span className="w-[32px] shrink-0" aria-hidden />
              </div>

              {/* Body */}
              {loading && !data ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    role="row"
                    className="flex items-center py-(--sp-5) px-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  >
                    <div role="cell" className="kit-skeleton h-[14px] w-full" />
                  </div>
                ))
              ) : (data?.items.length ?? 0) === 0 ? (
                <div role="row">
                  <div role="cell" className="p-(--sp-8)">
                    <EmptyState
                      title="Nothing in this range"
                      description={
                        showEverything
                          ? "No activity was logged for the selected filters."
                          : "No significant changes for the selected filters. Turn on “Show everything” to see routine activity."
                      }
                    />
                  </div>
                </div>
              ) : (
                data!.items.map((item) =>
                  item.kind === "single" ? (
                    <SingleRow
                      key={item.entry.id}
                      entry={item.entry}
                      expanded={expanded === item.entry.id}
                      onToggle={() => toggleItem(item.entry.id)}
                    />
                  ) : (
                    <BatchRow
                      key={item.correlationId}
                      item={item}
                      expanded={expanded === item.correlationId}
                      onToggle={() => toggleItem(item.correlationId)}
                      expandedChild={expandedChild}
                      onToggleChild={toggleChild}
                    />
                  ),
                )
              )}
            </div>

            {/* Mobile: each row is a card (audit-screen.md §"Mobile"). */}
            <div className="flex md:hidden flex-col border border-solid [border-color:var(--border-subtle)] [font-synthesis:none] antialiased">
              {loading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-(--sp-3) p-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  >
                    <div className="kit-skeleton h-[12px] w-2/3 rounded-sm" />
                    <div className="kit-skeleton h-[14px] w-3/4 rounded-sm" />
                    <div className="kit-skeleton h-[11px] w-1/3 rounded-sm" />
                  </div>
                ))
              ) : (data?.items.length ?? 0) === 0 ? (
                <div className="p-(--sp-7)">
                  <EmptyState
                    title="Nothing in this range"
                    description={
                      showEverything
                        ? "No activity was logged for the selected filters."
                        : "No significant changes for the selected filters. Turn on “Show everything” to see routine activity."
                    }
                  />
                </div>
              ) : (
                data!.items.map((item) =>
                  item.kind === "single" ? (
                    <SingleCard
                      key={item.entry.id}
                      entry={item.entry}
                      expanded={expanded === item.entry.id}
                      onToggle={() => toggleItem(item.entry.id)}
                    />
                  ) : (
                    <BatchCard
                      key={item.correlationId}
                      item={item}
                      expanded={expanded === item.correlationId}
                      onToggle={() => toggleItem(item.correlationId)}
                      expandedChild={expandedChild}
                      onToggleChild={toggleChild}
                    />
                  ),
                )
              )}
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between py-(--sp-5) px-(--sp-5) md:px-0">
              <span className="font-ui [color:var(--text-tertiary)] text-caption/caption">
                {first}–{last} of {total}
              </span>
              <div className="flex items-center gap-(--sp-5)">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="font-ui font-(--weight-medium) text-sm/sm rounded-sm kit-focus-ring disabled:[color:var(--text-disabled)] disabled:cursor-not-allowed [color:var(--text-primary)] enabled:hover:[color:var(--color-accent)]"
                >
                  <span className="hidden md:inline">Previous</span>
                  <span className="md:hidden">Prev</span>
                </button>
                <span className="font-ui [color:var(--text-secondary)] text-caption/caption">
                  <span className="hidden md:inline">Page </span>
                  {page + 1}
                  <span className="hidden md:inline"> of {pageCount}</span>
                  <span className="md:hidden"> / {pageCount}</span>
                </span>
                <button
                  type="button"
                  disabled={!data?.page.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                  className="font-ui font-(--weight-medium) text-sm/sm rounded-sm kit-focus-ring disabled:[color:var(--text-disabled)] disabled:cursor-not-allowed [color:var(--text-primary)] enabled:hover:[color:var(--color-accent)]"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
