// Verbatim REST transcription of Paper artboard "Component Kit — Tabs & Filters"
// (6IW-0): "Pill Row" (6JK-0). active + inactive drawn; layout unchanged.
//
// Session 10 rewire (owner decision, kit-audit §1): PillFilter is a single-select
// location filter → the WAI-ARIA APG **radiogroup** pattern, same as
// SegmentedControl.
//   - role="radiogroup" + role="radio" + aria-checked (replaces N× aria-pressed).
//   - roving tabIndex (only the checked pill is tabbable); ArrowLeft/Right +
//     Home/End move + select (selection follows focus), via internal/roving.ts.
//   - the redundant inline `hover:[…surface-hover]` and `opacity-[0.5]
//     pointer-events-none` are removed — §9.3 hover + §9.7 disabled come from
//     .kit-interactive. active = --surface-selected (§9.4, selected wins — no
//     hover bg on the active pill).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRovingGroup } from "./internal/roving";

export interface PillFilterOption {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface PillFilterProps {
  options: PillFilterOption[];
  activeKey: string;
  onChange?: (key: string) => void;
  /** Accessible name for the group, e.g. "Filter by location". */
  "aria-label"?: string;
  className?: string;
}

export function PillFilter({
  options,
  activeKey,
  onChange,
  className,
  ...props
}: PillFilterProps) {
  const { onKeyDown, tabIndexFor, itemRef } = useRovingGroup({
    items: options,
    activeKey,
    onChange,
    orientation: "horizontal",
  });

  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      onKeyDown={onKeyDown}
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
            ref={itemRef(opt.key)}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={tabIndexFor(opt.key)}
            disabled={opt.disabled}
            onClick={() => onChange?.(opt.key)}
            className={cn(
              "flex items-center justify-center h-(--control-sm) px-(--sp-6) rounded-lg kit-interactive kit-focus-ring",
              // §9.4: selected wins over hover and never stacks with it — pin
              // --kit-hover-bg to the selected tint so hovering the active pill
              // keeps it (otherwise .kit-interactive:hover repaints it grey).
              isActive &&
                "bg-(--surface-selected) [--kit-hover-bg:var(--surface-selected)] [--kit-active-bg:var(--surface-selected)]",
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
