// Verbatim REST transcription of Paper artboard "Component Kit — Form Controls"
// (6CG-0): "Segmented Control" (6D9-0) + "Segmented Control — Disabled" (9NL-0).
// active = shadow lift + accent label (design-principles.md §4.5 — the one place
// a small-control shadow is allowed); resting = --text-secondary, no lift;
// disabled whole control = opacity + --text-disabled labels. Layout unchanged.
//
// Session 10 rewire:
//   - raw `[box-shadow:#00000014_0px_1px_2px]` → `[box-shadow:var(--shadow-sm)]`.
//   - raw `tracking-[0.04em]` → `[letter-spacing:var(--tracking-caps)]`.
//   - WAI-ARIA APG radiogroup: roving tabIndex (only the checked segment is
//     tabbable); ArrowLeft/Right/Up/Down + Home/End move + select, via
//     internal/roving.ts. The `label` is linked with aria-labelledby.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRovingGroup } from "./internal/roving";

export interface SegmentedControlProps {
  label?: string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** Accessible name when `label` is not rendered. */
  "aria-label"?: string;
  className?: string;
}

export function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onChange,
  disabled = false,
  className,
  ...props
}: SegmentedControlProps) {
  const reactId = React.useId();
  const labelId = `seg-${reactId}-label`;
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]);
  const current = isControlled ? value : internal;

  const pick = React.useCallback(
    (next: string) => {
      if (disabled) return;
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [disabled, isControlled, onChange],
  );

  const { onKeyDown, tabIndexFor } = useRovingGroup({
    items: options.map((o) => ({ key: o, disabled })),
    activeKey: current ?? options[0],
    onChange: pick,
    orientation: "both",
  });

  return (
    <div className={cn("flex flex-col gap-[6px]", className)}>
      {label && (
        <div
          id={labelId}
          className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-secondary)] text-caption/micro"
        >
          {label}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={props["aria-label"]}
        aria-labelledby={label ? labelId : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "flex items-center h-(--control-md) p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]",
          disabled && "opacity-[0.5]",
        )}
      >
        {options.map((opt) => {
          const isActive = opt === current;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={disabled ? -1 : tabIndexFor(opt)}
              disabled={disabled}
              onClick={() => pick(opt)}
              className={cn(
                "flex items-center justify-center h-(--control-sm) px-(--sp-5) rounded-[2px] kit-interactive kit-focus-ring",
                isActive && "[box-shadow:var(--shadow-sm)] bg-(--surface-page)",
              )}
            >
              <span
                className={cn(
                  "font-ui text-sm/sm",
                  disabled
                    ? cn(
                        isActive
                          ? "font-(--weight-medium)"
                          : "font-(--weight-regular)",
                        "[color:var(--text-disabled)]",
                      )
                    : isActive
                      ? "font-(--weight-medium) text-accent"
                      : "font-(--weight-regular) [color:var(--text-secondary)]",
                )}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
