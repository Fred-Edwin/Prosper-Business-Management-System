"use client";

// M2 3a — the merged-Sales filter toolbar.
//
// Composed from proven primitives (kit <Select>, kit <DatePicker>, a native
// checkbox) into the labelled-dropdown row from Paper IEA-0 (the [M2-SA]
// merged-Sales toolbar). This is the inline build the orchestrator asked 3a
// for; session 3e later folds every screen onto the shared <FilterToolbar>
// kit component (docs/design/filter-toolbar.md).
//
// Anatomy (IEA-0):
//   [ Cashier: All ▾ ] [ Payment: All ▾ ] [ 📅 Today ▾ ] [ ☐ Corrected only ]
//   ……spacer……  6 orders  ·  Reset
//
// Value display is load-bearing: a control AT its default renders its label
// --text-secondary / regular; OFF its default renders --text-primary / medium.
// Reset shows iff at least one control is off its default.
// Mobile (< --bp-md): the controls wrap onto rows; the count + Reset drop to
// their own row below.
//
// The date control is a chip that opens a small panel: quick "Today" /
// "Yesterday" / "All dates" rows, then the proven kit <DatePicker> calendar
// for any other day. Month paging in that calendar does NOT close the panel
// or commit a date — only clicking a day does.

import * as React from "react";
import { Select, type SelectOption } from "@/components/kit/select";
import { DatePicker } from "@/components/kit/date-picker";

// ── Control model ────────────────────────────────────────────────────

export type SelectControl = {
  id: string;
  kind: "select";
  label: string; // "Cashier", "Payment", "Product"
  options: SelectOption[]; // includes the default ("all") option
  value: string;
  default: string;
  /** Shown disabled with a caption instead of an options list. */
  disabled?: boolean;
  disabledCaption?: string;
};

export type DateControl = {
  id: string;
  kind: "date";
  label: string; // "Date", "Date range"
  /** `YYYY-MM-DD`, or null meaning "all dates". */
  value: string | null;
  /** `YYYY-MM-DD` (e.g. today) or null — the value that reads as "default". */
  default: string | null;
  /** Chip label when value === default (e.g. "Today" / "All dates"). */
  defaultLabel: string;
  /**
   * Chip label when value is null but null is NOT the default — i.e. the
   * "all dates" escape from a date-defaulted control. Omit when null IS
   * the default.
   */
  nullLabel?: string;
  /** Today's business date (`YYYY-MM-DD`) — powers the Today/Yesterday quick rows. */
  today: string;
  /** Disable days after this in the calendar. Defaults to today. */
  maxDate?: string;
};

export type FilterControl = SelectControl | DateControl;

function isOffDefault(c: FilterControl): boolean {
  return c.kind === "select"
    ? c.value !== c.default
    : (c.value ?? null) !== (c.default ?? null);
}

// ── Date helpers (business-date strings — no timezone maths here; the
// screen passes an already-Nairobi `today`) ─────────────────────────────

/** `YYYY-MM-DD` → a local Date at noon (noon avoids DST edge flips). */
function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
/** Date → `YYYY-MM-DD` (local parts). */
function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** `YYYY-MM-DD` → "26 Aug 2026". */
function fmtYmd(s: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseYmd(s));
}
function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

// ── Date chip — quick rows + the proven kit <DatePicker> calendar ──────

function DateChip({
  control,
  onChange,
}: {
  control: DateControl;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const off = isOffDefault(control);

  const yesterday = addDays(control.today, -1);
  const maxYmd = control.maxDate ?? control.today;

  // Chip label: default label, "All dates", "Today", "Yesterday", or the date.
  let chipLabel: string;
  if (!off) chipLabel = control.defaultLabel;
  else if (control.value === null)
    chipLabel = control.nullLabel ?? control.defaultLabel;
  else if (control.value === control.today) chipLabel = "Today";
  else if (control.value === yesterday) chipLabel = "Yesterday";
  else chipLabel = fmtYmd(control.value);

  // Close the panel on an outside click / Esc. (The kit <DatePicker> below
  // handles its OWN calendar popover's outside-click; this only governs the
  // quick-rows panel wrapper.)
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  const QUICK: { label: string; value: string | null }[] = [
    { label: "Today", value: control.today },
    { label: "Yesterday", value: yesterday },
    { label: "All dates", value: null },
  ];
  const currentQuick =
    !off ? control.default : control.value;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center h-[36px] px-(--sp-5) rounded-sm gap-(--sp-4) bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          <line x1="3" y1="9" x2="21" y2="9" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          <line x1="8" y1="2" x2="8" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span
          className={
            off
              ? "font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm"
              : "font-ui [color:var(--text-secondary)] text-sm/sm"
          }
        >
          {chipLabel}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Choose ${control.label}`}
          className="absolute top-[calc(100%+4px)] left-0 [z-index:var(--z-dropdown)] flex flex-col rounded-md border border-solid [border-color:var(--border-strong)] bg-(--surface-page) [box-shadow:var(--shadow-md)] min-w-[184px] p-[4px]"
        >
          {QUICK.map((q) => {
            const selected = currentQuick === q.value;
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => choose(q.value)}
                aria-pressed={selected}
                className="flex items-center justify-between h-(--control-md) px-(--sp-4) rounded-sm font-ui text-sm/sm [color:var(--text-primary)] text-left kit-interactive kit-focus-ring data-[sel=true]:bg-(--surface-selected)"
                data-sel={selected}
              >
                {q.label}
                {selected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                    <polyline points="20 6 9 17 4 12" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}

          <div className="my-[4px] h-px [background:var(--border-subtle)]" />

          {/* Any other day — the proven kit <DatePicker>. Its ‹ › month paging
              does NOT close this panel or commit anything; only clicking a day
              fires onSelect. Future days are disabled (maxDate). */}
          <div className="px-(--sp-4) py-(--sp-3)">
            <span className="font-ui [color:var(--text-tertiary)] text-micro/micro uppercase [letter-spacing:var(--tracking-caps)]">
              Or pick a day
            </span>
            <div className="mt-(--sp-2)">
              <DatePicker
                value={
                  control.value &&
                  control.value !== control.today &&
                  control.value !== yesterday
                    ? fmtYmd(control.value)
                    : "Choose…"
                }
                selected={control.value ? parseYmd(control.value) : undefined}
                maxDate={parseYmd(maxYmd)}
                onSelect={(d) => choose(toYmd(d))}
                className="w-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Select chip ─────────────────────────────────────────────────────

function SelectChip({
  control,
  onChange,
}: {
  control: SelectControl;
  onChange: (value: string) => void;
}) {
  const off = isOffDefault(control);
  const currentLabel =
    control.options.find((o) => o.value === control.value)?.label ??
    control.options.find((o) => o.value === control.default)?.label ??
    "All";

  if (control.disabled) {
    return (
      <div className="flex flex-col gap-(--sp-1) shrink-0">
        <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm gap-(--sp-4) bg-(--surface-subtle) border border-solid [border-color:var(--border-subtle)] opacity-60">
          <span className="font-ui [color:var(--text-disabled)] text-sm/sm">
            {control.label}: {currentLabel}
          </span>
        </div>
        {control.disabledCaption && (
          <span className="font-ui [color:var(--text-tertiary)] text-micro/micro">
            {control.disabledCaption}
          </span>
        )}
      </div>
    );
  }

  // The kit <Select> renders "<value label>" in its trigger; we want
  // "<Label>: <value label>". Prefix the option labels so the trigger reads
  // "Cashier: All cashiers" etc. The value keys stay bare.
  const prefixed = control.options.map((o) => ({
    value: o.value,
    label: `${control.label}: ${o.label}`,
  }));

  // The kit <Select> (no visible label) leaves its combobox button unnamed —
  // `role="combobox"` doesn't take its name from child text. Wrap it in a
  // labelled group so the control is still announced ("Cashier", "Payment")
  // without adding the visible label the IEA-0 toolbar doesn't have.
  return (
    <div
      role="group"
      aria-label={control.label}
      className={
        off
          ? "shrink-0 [&_button[role=combobox]]:font-(--weight-medium) [&_button[role=combobox]_span]:[color:var(--text-primary)]"
          : "shrink-0"
      }
    >
      <Select
        options={prefixed}
        value={control.value}
        onChange={onChange}
        className="w-auto min-w-[160px]"
      />
    </div>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────

export function SalesFilterToolbar({
  controls,
  onChange,
  onReset,
  resultCount,
  resultNoun,
  correctedOnly,
  onCorrectedOnlyChange,
}: {
  controls: FilterControl[];
  onChange: (id: string, value: string | null) => void;
  onReset: () => void;
  resultCount: number;
  resultNoun: string;
  /** The "Corrected only" checkbox is Orders-tab-only — pass undefined to hide. */
  correctedOnly?: boolean;
  onCorrectedOnlyChange?: (next: boolean) => void;
}) {
  const anyOffDefault =
    controls.some(isOffDefault) || correctedOnly === true;
  const noun =
    resultCount === 1 && resultNoun.endsWith("s")
      ? resultNoun.slice(0, -1)
      : resultNoun;

  return (
    <div
      role="search"
      aria-label="Filters"
      className="flex flex-col md:flex-row md:items-center gap-(--sp-4) py-(--sp-6) px-(--sp-6)"
    >
      {/* Controls — wrap onto rows on mobile (NOT overflow-x-auto: that
          clips the Select / date popovers, which drop downward). The
          [M2-SA] mobile artboards show at most 2–4 chips, so they wrap
          cleanly. */}
      <div className="flex flex-wrap items-center gap-(--sp-4) md:flex-nowrap md:flex-1">
        {controls.map((c) =>
          c.kind === "select" ? (
            <SelectChip
              key={c.id}
              control={c}
              onChange={(v) => onChange(c.id, v)}
            />
          ) : (
            <DateChip
              key={c.id}
              control={c}
              onChange={(v) => onChange(c.id, v)}
            />
          ),
        )}
        {onCorrectedOnlyChange && (
          <label className="flex items-center h-[36px] px-(--sp-3) gap-(--sp-3) shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={correctedOnly ?? false}
              onChange={(e) => onCorrectedOnlyChange(e.target.checked)}
              className="w-[16px] h-[16px] shrink-0 rounded-sm border border-solid [border-color:var(--border-strong)] kit-focus-ring accent-[var(--color-accent)]"
            />
            <span
              className={
                correctedOnly
                  ? "font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm"
                  : "font-ui [color:var(--text-secondary)] text-sm/sm"
              }
            >
              Corrected only
            </span>
          </label>
        )}
      </div>

      {/* Count + Reset — own row on mobile */}
      <div className="flex items-center gap-(--sp-4) shrink-0">
        <span
          aria-live="polite"
          className="font-ui [color:var(--text-tertiary)] text-sm/sm"
        >
          {resultCount} {noun}
        </span>
        {anyOffDefault && (
          <>
            <span aria-hidden className="[color:var(--text-tertiary)] text-sm/sm">
              ·
            </span>
            <button
              type="button"
              onClick={onReset}
              className="font-ui font-(--weight-medium) text-accent text-sm/sm kit-focus-ring rounded-sm"
            >
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}
