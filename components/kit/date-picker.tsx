// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Date Picker" (6X2-0, closed) and "Date Picker — Open" (9S1-0, attached calendar popover).
// Trigger + popover markup merged behind an `open` state; minimal real behaviour per §B1:
// open/close, Esc-to-close, click-outside. The calendar grid keeps Paper's exact drawing —
// per-day classes are the exact strings the artboard emitted:
//   normal day  : (no box) label [color:var(--text-primary)] text-caption/micro
//   today       : rounded-sm border border-solid border-accent
//   selected    : rounded-sm bg-accent, label text-white
//   disabled    : label [color:var(--text-disabled)]
// The day matrix is caller-supplied data (weeks of { day, today, selected, disabled }).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
  /** Header label of the visible month, e.g. "August 2026". */
  monthLabel?: string;
  /** Week rows for the visible month. */
  weeks?: DatePickerDay[][];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onSelectDay?: (day: number) => void;
  className?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function DatePicker({
  label,
  value,
  monthLabel,
  weeks,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={rootRef}
      className={cn(
        "[font-synthesis:none] flex flex-col w-[200px] gap-[6px] shrink-0 antialiased relative",
        className,
      )}
    >
      {label && (
        <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
          {label}
        </div>
      )}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)] kit-field kit-focus-ring"
      >
        <span className="font-mono [color:var(--text-primary)] text-sm/sm">{value}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="2" x2="8" y2="6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="10" x2="21" y2="10" stroke="var(--text-tertiary)" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-[4px] flex flex-col w-[236px] p-[12px] rounded-md gap-[8px] [box-shadow:#00000014_0px_4px_12px] bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
          <div className="flex items-center justify-between">
            <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">
              {monthLabel}
            </div>
            <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
              <button type="button" onClick={onPrevMonth} aria-label="Previous month" className="kit-focus-ring">
                ‹
              </button>{" "}
              <button type="button" onClick={onNextMonth} aria-label="Next month" className="kit-focus-ring">
                ›
              </button>
            </div>
          </div>
          <div className="flex gap-[2px]">
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                className="grow basis-[0%] text-center font-ui text-micro inline-block leading-[14px] [color:var(--text-tertiary)]"
              >
                {d}
              </div>
            ))}
          </div>
          {(weeks ?? []).map((week, wi) => (
            <div key={wi} className="flex gap-[2px]">
              {week.map((cell, ci) => (
                <div
                  key={ci}
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
                      "inline-block font-mono text-center text-caption/micro w-full",
                      cell.selected
                        ? "text-white"
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
          <div className="font-ui text-micro inline-block leading-[14px] [color:var(--text-tertiary)]">
            Today ringed · selected = accent fill · future dates disabled
          </div>
        </div>
      )}
    </div>
  );
}
