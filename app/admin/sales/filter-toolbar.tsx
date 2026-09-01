"use client";

// M2 3a — the merged-Sales filter toolbar.
//
// Composed from proven primitives (kit <Select>, a native <input type="date">
// in a popover, a native checkbox) into the labelled-dropdown row from Paper
// IEA-0 (the [M2-SA] merged-Sales toolbar). This is the inline build the
// orchestrator asked 3a for; session 3e later folds every screen onto the
// shared <FilterToolbar> kit component (docs/design/filter-toolbar.md).
//
// Anatomy (IEA-0):
//   [ Cashier: All ▾ ] [ Payment: All ▾ ] [ 📅 Today ] [ ☐ Corrected only ]
//   ……spacer……  6 orders  ·  Reset
//
// Value display is load-bearing: a control AT its default renders its label
// --text-secondary / regular; OFF its default renders --text-primary / medium.
// Reset shows iff at least one control is off its default.
// Mobile (< --bp-md): the row scrolls horizontally (overflow-x-auto); the
// count + Reset drop to their own row below.

import * as React from "react";
import { Select, type SelectOption } from "@/components/kit/select";

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
};

export type FilterControl = SelectControl | DateControl;

function isOffDefault(c: FilterControl): boolean {
  return c.kind === "select"
    ? c.value !== c.default
    : (c.value ?? null) !== (c.default ?? null);
}

// ── Date chip (native input in a small popover) ──────────────────────

function DateChip({
  control,
  onChange,
}: {
  control: DateControl;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputId = `filter-${control.id}-input`;
  const off = isOffDefault(control);
  const shownLabel = !off
    ? control.defaultLabel
    : control.value
      ? control.value
      : (control.nullLabel ?? control.defaultLabel);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

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
          {shownLabel}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`Choose ${control.label}`}
          className="absolute top-[calc(100%+4px)] left-0 [z-index:var(--z-dropdown)] flex flex-col gap-(--sp-3) p-(--sp-4) rounded-md border border-solid [border-color:var(--border-strong)] bg-(--surface-page) [box-shadow:var(--shadow-md)]"
        >
          <label
            htmlFor={inputId}
            className="font-ui [color:var(--text-secondary)] text-caption/micro"
          >
            {control.label}
          </label>
          <input
            id={inputId}
            type="date"
            defaultValue={control.value ?? ""}
            className="font-ui [color:var(--text-primary)] text-sm/sm border border-solid [border-color:var(--border-strong)] rounded-sm px-(--sp-3) py-(--sp-2) bg-(--surface-page) kit-focus-ring"
            onChange={(e) => {
              onChange(e.target.value || null);
              setOpen(false);
            }}
          />
          {isOffDefault(control) && (
            <button
              type="button"
              onClick={() => {
                onChange(control.default);
                setOpen(false);
              }}
              className="self-start font-ui font-(--weight-medium) text-accent text-caption/micro kit-focus-ring rounded-sm"
            >
              {control.defaultLabel}
            </button>
          )}
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
