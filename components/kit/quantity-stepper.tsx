// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Quantity Stepper" (6XC-0) — the `[ − | value | + | unit ]` control. Plus the
// "Quantity Stepper — Error" state row from Form Controls (6CG-0, 9N5-0): on error the outer
// box swaps to `border border-solid border-danger` and a danger helper row is rendered below
// (same §9.8 error-field pattern as text-input).
//
// − disabled at min / + disabled at max (component-states.md §2 C10) — the "− greyed at
// min bound" artboard is the §9 disabled rule applied to a single button: opacity-[0.5],
// pointer-events:none. Encoded here via .kit-interactive + `disabled`.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface QuantityStepperProps {
  label?: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  error?: boolean;
  helperText?: string;
  /** Formats the numeric value for display. Default: `String(value)`. */
  format?: (value: number) => string;
  className?: string;
}

export function QuantityStepper({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  error = false,
  helperText,
  format = (v) => String(v),
  className,
}: QuantityStepperProps) {
  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-col w-[220px] gap-[6px] shrink-0 antialiased",
        className,
      )}
    >
      {label && (
        <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
          {label}
        </div>
      )}
      <div
        className={cn(
          "flex items-center h-[36px] rounded-sm shrink-0 border border-solid kit-field",
          error ? "border-danger" : "[border-color:var(--border-strong)]",
        )}
        data-invalid={error || undefined}
      >
        <button
          type="button"
          disabled={atMin}
          onClick={() => onChange?.(value - step)}
          aria-label="Decrease"
          className="flex items-center justify-center w-[32px] h-[36px] shrink-0 border-r border-r-solid [border-right-color:var(--border-subtle)] kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-semibold) [color:var(--text-secondary)] text-body/sm">
            −
          </span>
        </button>
        <div className="grow flex items-center justify-center">
          <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro">
            {format(value)}
          </span>
        </div>
        <button
          type="button"
          disabled={atMax}
          onClick={() => onChange?.(value + step)}
          aria-label="Increase"
          className="flex items-center justify-center w-[32px] h-[36px] shrink-0 border-l border-l-solid [border-left-color:var(--border-subtle)] kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-semibold) [color:var(--text-secondary)] text-body/sm">
            +
          </span>
        </button>
        {unit && (
          <div className="flex items-center px-(--sp-4) shrink-0 border-l border-l-solid [border-left-color:var(--border-subtle)]">
            <span className="font-ui w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              {unit}
            </span>
          </div>
        )}
      </div>
      {helperText && (
        <div className="font-ui font-(--weight-regular) text-danger text-caption/micro">
          {helperText}
        </div>
      )}
    </div>
  );
}
