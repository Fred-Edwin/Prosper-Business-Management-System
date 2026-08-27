// Verbatim transcription of Paper artboard "Component Kit — Tabs & Filters" (6IW-0):
// "Pill Row" (6JK-0). Session 2: 6IW-0 draws active + inactive only (no inactive outline,
// no disabled row) and it is byte-identical to the Ledger usage. Row = flex items-center
// gap-[6px]. Each pill: h-[32px] px-(--sp-6) rounded-lg, `bg-(--surface-selected)` when
// active (else no bg). Label text-sm/sm: active = font-(--weight-medium) text-accent;
// inactive = font-(--weight-regular) [color:var(--text-secondary)].
//
// hover (inactive → --surface-hover) and focus-visible ring are §9 globals. `disabled`
// (component-states.md §2 C12 — a pill for a location with no data) uses the §9.7 rule;
// do NOT invent an inactive outline.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PillFilterOption {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface PillFilterProps {
  options: PillFilterOption[];
  activeKey: string;
  onChange?: (key: string) => void;
  className?: string;
}

export function PillFilter({
  options,
  activeKey,
  onChange,
  className,
}: PillFilterProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center gap-[6px] antialiased",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.key === activeKey;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={isActive}
            disabled={opt.disabled}
            onClick={() => onChange?.(opt.key)}
            className={cn(
              "flex items-center justify-center h-[32px] px-(--sp-6) rounded-lg kit-interactive kit-focus-ring",
              isActive ? "bg-(--surface-selected)" : "hover:[background-color:var(--surface-hover)]",
              opt.disabled && "opacity-[0.5] pointer-events-none",
            )}
          >
            <span
              className={cn(
                "font-ui text-sm/sm",
                isActive
                  ? "font-(--weight-medium) text-accent"
                  : "font-(--weight-regular) [color:var(--text-secondary)]",
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
