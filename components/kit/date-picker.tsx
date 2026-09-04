// Verbatim REST transcription of Paper artboard "Component Kit — Utility & Layout"
// (6WD-0): "Date Picker" (6X2-0, closed) + "— Open" (9S1-0, calendar popover).
// The trigger + popover visual (month header + ‹ ›, weekday row, day grid with
// today ringed / selected = accent fill / future disabled) is byte-identical
// EXCEPT the visual-polish pass below — same footing as the DenseLedger
// Location column / Kitchen rename (owner-authorised divergence, artboard
// now stale on this point, not yet re-synced).
//
// Session 10 rewire (owner-approved, kit-audit §1) — a real WAI-ARIA APG
// "Date Picker Dialog":
//   - internal visible-month state, derived from `selected` (a real Date) or
//     today. The caller no longer has to compute weeks — but `weeks` is kept as
//     an escape hatch (the kit gallery + any pre-wired screen still pass it).
//   - popover is role="dialog" aria-modal="false" aria-label; the grid is
//     role="grid" / role="row" / role="gridcell" with aria-selected.
//   - keyboard: on open, focus lands on the selected (or today) day cell.
//     ←/→ = ±1 day, ↑/↓ = ±1 week, Home/End = week start/end,
//     PageUp/PageDown = ±1 month, Shift+PageUp/Down = ±1 year, Enter/Space =
//     select + close, Esc = close. Roving tabindex over the day cells.
//   - raw shadow → --shadow-md; z-10 → --z-dropdown; label linked via
//     aria-labelledby.
//
// Visual polish (this session, owner review of the Ledger's date filter —
// "it functions, but I think it can look better"):
//   - ‹ › text glyphs → real Lucide ChevronLeft/ChevronRight (matches the
//     rest of the icon system, design-principles.md §5: 1.5px stroke).
//   - a "Today" quick-jump in the popover footer, replacing the old
//     explanatory caption line ("Today ringed · selected = accent fill …")
//     — an action is more useful than a legend once the ring/fill visual
//     language is legible on its own.
//   - month header weight/size tightened against the weekday row for
//     clearer hierarchy.
// Behavior (keyboard nav, ARIA, min/max, the `legacy` escape hatch) is
// completely unchanged — polish only.
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ICON_PROPS = { width: 14, height: 14, strokeWidth: 1.5, "aria-hidden": true } as const;

/** Kept for the escape-hatch `weeks` prop (pre-computed grid). */
export interface DatePickerDay {
  day: number;
  today?: boolean;
  selected?: boolean;
  disabled?: boolean;
}

export interface DatePickerProps {
  label?: string;
  /** Formatted trigger value, e.g. "Aug 24, 2026". */
  value: string;
  /** The selected date. When given, the calendar derives its own grid + nav. */
  selected?: Date;
  /** Called with the picked Date (real-calendar mode). */
  onSelect?: (date: Date) => void;
  /** Disable dates after this (e.g. `new Date()` — no future). */
  maxDate?: Date;
  /** Disable dates before this. */
  minDate?: Date;
  // --- escape hatch (pre-computed grid; overrides the internal calendar) ---
  monthLabel?: string;
  weeks?: DatePickerDay[][];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onSelectDay?: (day: number) => void;
  /**
   * Accessible name for the trigger when used WITHOUT a visible `label`
   * (e.g. inside FilterToolbar). Ignored when `label` is set — the trigger
   * is then named via aria-labelledby. Additive / a11y-only (M2-3KIT-FILTER).
   */
  "aria-label"?: string;
  className?: string;
  id?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** Monday-first grid of Dates covering the visible month. */
function monthGrid(view: Date): Date[][] {
  const first = startOfMonth(view);
  const offset = (first.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  const weeks: Date[][] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(row);
    if (cur.getMonth() !== view.getMonth() && w >= 4) break;
  }
  return weeks;
}

export function DatePicker({
  label,
  value,
  selected,
  onSelect,
  maxDate,
  minDate,
  monthLabel,
  weeks,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  "aria-label": ariaLabel,
  className,
  id,
}: DatePickerProps) {
  const reactId = React.useId();
  const triggerId = id ?? `dp-${reactId}`;
  const labelId = `${triggerId}-label`;
  const dialogId = `${triggerId}-dialog`;
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const legacy = weeks !== undefined;
  const today = React.useMemo(() => new Date(), []);
  const [view, setView] = React.useState<Date>(
    startOfMonth(selected ?? today),
  );
  const [focusedDate, setFocusedDate] = React.useState<Date>(
    selected ?? today,
  );

  React.useEffect(() => {
    if (open && !legacy) {
      const start = startOfMonth(selected ?? today);
      setView(start);
      setFocusedDate(selected ?? today);
      // move DOM focus onto the focused cell after paint
      requestAnimationFrame(() => {
        gridRef.current
          ?.querySelector<HTMLButtonElement>('[data-focused="true"]')
          ?.focus();
      });
    }
  }, [open, legacy, selected, today]);

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

  function isDisabled(d: Date) {
    if (maxDate && d > maxDate && !sameDay(d, maxDate)) return true;
    if (minDate && d < minDate && !sameDay(d, minDate)) return true;
    return false;
  }

  function pick(d: Date) {
    if (isDisabled(d)) return;
    onSelect?.(d);
    setOpen(false);
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const next = new Date(focusedDate);
    switch (e.key) {
      case "ArrowLeft": next.setDate(next.getDate() - 1); break;
      case "ArrowRight": next.setDate(next.getDate() + 1); break;
      case "ArrowUp": next.setDate(next.getDate() - 7); break;
      case "ArrowDown": next.setDate(next.getDate() + 7); break;
      case "Home": next.setDate(next.getDate() - ((next.getDay() + 6) % 7)); break;
      case "End": next.setDate(next.getDate() + (6 - ((next.getDay() + 6) % 7))); break;
      case "PageUp":
        next.setMonth(next.getMonth() - (e.shiftKey ? 12 : 1));
        break;
      case "PageDown":
        next.setMonth(next.getMonth() + (e.shiftKey ? 12 : 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(focusedDate);
        return;
      default:
        return;
    }
    e.preventDefault();
    setFocusedDate(next);
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
      setView(startOfMonth(next));
    }
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>('[data-focused="true"]')
        ?.focus();
    });
  }

  const header = legacy
    ? monthLabel
    : `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  const grid = legacy ? null : monthGrid(view);

  return (
    <div
      ref={rootRef}
      className={cn(
        "[font-synthesis:none] flex flex-col w-[200px] gap-[6px] shrink-0 antialiased relative",
        className,
      )}
    >
      {label && (
        <div
          id={labelId}
          className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-secondary)] text-caption/micro"
        >
          {label}
        </div>
      )}
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-label={label ? undefined : ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between h-(--control-md) px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)] kit-field kit-focus-ring"
      >
        <span className="font-mono [color:var(--text-primary)] text-sm/sm">{value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="2" x2="8" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="10" x2="21" y2="10" stroke="var(--text-tertiary)" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label={`Choose date${label ? `, ${label}` : ""}`}
          className="absolute left-0 top-full [z-index:var(--z-dropdown)] mt-[4px] flex flex-col w-[236px] p-(--sp-5) rounded-md gap-(--sp-4) [box-shadow:var(--shadow-md)] bg-(--surface-page) border border-solid [border-color:var(--border-strong)]"
        >
          <div className="flex items-center justify-between">
            <div
              className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-body/sm"
              aria-live="polite"
            >
              {header}
            </div>
            <div className="flex items-center gap-[2px] [color:var(--text-secondary)]">
              <button
                type="button"
                onClick={() =>
                  legacy
                    ? onPrevMonth?.()
                    : setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
                aria-label="Previous month"
                className="flex items-center justify-center w-[22px] h-[22px] rounded-sm kit-interactive kit-focus-ring"
              >
                <ChevronLeft {...NAV_ICON_PROPS} />
              </button>
              <button
                type="button"
                onClick={() =>
                  legacy
                    ? onNextMonth?.()
                    : setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
                aria-label="Next month"
                className="flex items-center justify-center w-[22px] h-[22px] rounded-sm kit-interactive kit-focus-ring"
              >
                <ChevronRight {...NAV_ICON_PROPS} />
              </button>
            </div>
          </div>

          <div className="flex gap-[2px]" aria-hidden>
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                className="grow basis-[0%] text-center font-ui text-micro inline-block leading-[14px] [color:var(--text-tertiary)]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Legacy pre-computed grid */}
          {legacy ? (
            <div role="grid" className="flex flex-col gap-[2px]">
              {(weeks ?? []).map((week, wi) => (
                <div key={wi} role="row" className="flex gap-[2px]">
                  {week.map((cell, ci) => (
                    <div
                      key={ci}
                      role="gridcell"
                      aria-selected={cell.selected || undefined}
                      className={cn(
                        "grow basis-[0%] font-mono inline-block py-[4px]",
                        cell.today && "rounded-sm border border-solid border-accent",
                        cell.selected && "rounded-sm bg-accent",
                      )}
                    >
                      <button
                        type="button"
                        disabled={cell.disabled}
                        onClick={() => onSelectDay?.(cell.day)}
                        className={cn(
                          "inline-block font-mono text-center text-caption/micro w-full kit-focus-ring rounded-sm",
                          cell.selected
                            ? "text-(--text-inverse)"
                            : cell.disabled
                              ? "[color:var(--text-disabled)]"
                              : "[color:var(--text-primary)]",
                        )}
                      >
                        {cell.day}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={gridRef}
              role="grid"
              className="flex flex-col gap-[2px]"
              onKeyDown={onGridKeyDown}
            >
              {grid!.map((week, wi) => (
                <div key={wi} role="row" className="flex gap-[2px]">
                  {week.map((date) => {
                    const inMonth = date.getMonth() === view.getMonth();
                    const isToday = sameDay(date, today);
                    const isSelected = selected ? sameDay(date, selected) : false;
                    const isFocused = sameDay(date, focusedDate);
                    const disabled = isDisabled(date);
                    return (
                      <div
                        key={date.toISOString()}
                        role="gridcell"
                        aria-selected={isSelected || undefined}
                        className={cn(
                          "grow basis-[0%] font-mono inline-block py-[4px]",
                          isToday && !isSelected &&
                            "rounded-sm border border-solid border-accent",
                          isSelected && "rounded-sm bg-accent",
                        )}
                      >
                        <button
                          type="button"
                          tabIndex={isFocused ? 0 : -1}
                          data-focused={isFocused || undefined}
                          disabled={disabled}
                          aria-current={isToday ? "date" : undefined}
                          aria-label={`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}
                          onClick={() => {
                            setFocusedDate(date);
                            pick(date);
                          }}
                          className={cn(
                            "inline-block font-mono text-center text-caption/micro w-full kit-focus-ring rounded-sm",
                            isSelected
                              ? "text-(--text-inverse)"
                              : disabled
                                ? "[color:var(--text-disabled)]"
                                : inMonth
                                  ? "[color:var(--text-primary)]"
                                  : "[color:var(--text-tertiary)]",
                          )}
                        >
                          {date.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* "Today" quick-jump (this session) replaces the old static legend
              line — real-calendar mode only, `legacy` has no Date to jump to. */}
          {!legacy && (
            <button
              type="button"
              onClick={() => pick(today)}
              disabled={isDisabled(today)}
              className="font-ui font-(--weight-medium) self-start text-accent text-caption/micro kit-focus-ring rounded-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              Today
            </button>
          )}
        </div>
      )}
    </div>
  );
}
