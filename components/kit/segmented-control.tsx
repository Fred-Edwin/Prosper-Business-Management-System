// Verbatim transcription of Paper artboard "Component Kit — Form Controls" (6CG-0):
// "Segmented Control" (6D9-0, base — segment 1 active + 2/3 resting) and
// "Segmented Control — Disabled" (9NL-0). Per-segment + track markup merged behind props
// (value / onChange / disabled), switching the exact classes each state's get_jsx emitted:
//   active segment: rounded-[2px] [box-shadow:#00000014_0px_1px_2px] bg-(--surface-page),
//                   label font-(--weight-medium) text-accent
//   resting segment: rounded-[2px] (no bg/shadow), label font-(--weight-regular)
//                    [color:var(--text-secondary)]
//   disabled whole control: track adds opacity-[0.5]; every label [color:var(--text-disabled)]
//
// hover on a resting segment (--text-primary label) is the §9 global.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlProps {
  label?: string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
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
}: SegmentedControlProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]);
  const current = isControlled ? value : internal;

  function pick(next: string) {
    if (disabled) return;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  return (
    <div className={cn("flex flex-col gap-[6px]", className)}>
      {label && (
        <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
          {label}
        </div>
      )}
      <div
        role="radiogroup"
        className={cn(
          "flex items-center h-[36px] p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]",
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
              disabled={disabled}
              onClick={() => pick(opt)}
              className={cn(
                "flex items-center justify-center h-[32px] px-(--sp-5) rounded-[2px] kit-interactive kit-focus-ring",
                isActive && "[box-shadow:#00000014_0px_1px_2px] bg-(--surface-page)",
              )}
            >
              <span
                className={cn(
                  "font-ui text-sm/sm",
                  disabled
                    ? isActive
                      ? "font-(--weight-medium) [color:var(--text-disabled)]"
                      : "font-(--weight-regular) [color:var(--text-disabled)]"
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
