// Verbatim REST transcription of Paper artboard "Component Kit — Utility & Layout"
// (6WD-0): "Quantity Stepper" (6XC-0) — `[ − | value | + | unit ]` — plus the
// error state (Form Controls 9N5-0: danger box + danger helper). Layout unchanged.
//
// Session 10 rewire (owner-approved, kit-audit §1): the value is now a real
// <input inputmode="decimal"> (was a <span>), so the spec'd "focus (value field)"
// and "error (out-of-range typed value)" states (component-states.md §2 C10) are
// actually reachable, and ↑/↓ step the value. REST visual is byte-identical — the
// input is unstyled, centered, mono, same size.
//   - role="spinbutton" on the input + aria-valuenow / -valuemin / -valuemax /
//     -valuetext (with unit) — the whole control is a labelled spinbutton.
//   - − / + are native <button> with aria-label; disabled at min / max via the
//     shared §9.7 rule (.kit-interactive:disabled + `disabled`).
//   - label + helper/error row via <FormField>. API unchanged (`error?: boolean`
//     + `helperText?`; new optional `onChange` still gets the numeric value; a
//     new optional `onValueString` gives the raw typed string for validation).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

export interface QuantityStepperProps {
  label?: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  /** Raw typed string (before parse) — for out-of-range / non-numeric checks. */
  onValueString?: (raw: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  /** Formats the numeric value for display. Default: `String(value)`. */
  format?: (value: number) => string;
  className?: string;
  id?: string;
}

export function QuantityStepper({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  onValueString,
  error = false,
  helperText,
  required,
  format = (v) => String(v),
  className,
  id,
}: QuantityStepperProps) {
  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;
  const [editing, setEditing] = React.useState<string | null>(null);

  const display = editing ?? format(value);

  function commit(raw: string) {
    onValueString?.(raw);
    const n = Number.parseFloat(raw);
    if (!Number.isNaN(n)) onChange?.(n);
    setEditing(null);
  }

  return (
    <FormField
      label={label}
      error={error ? helperText || " " : undefined}
      hint={!error ? helperText : undefined}
      required={required}
      id={id}
      className="w-[220px]"
    >
      {({ id: inputId, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
        <div
          className={cn(
            "flex items-center h-(--control-md) rounded-sm shrink-0 border border-solid kit-field",
            error ? "border-danger" : "[border-color:var(--border-strong)]",
            className,
          )}
          data-invalid={invalid || undefined}
        >
          <button
            type="button"
            disabled={atMin}
            onClick={() => onChange?.(value - step)}
            aria-label="Decrease"
            tabIndex={-1}
            className="flex items-center justify-center w-(--control-sm) h-(--control-md) shrink-0 border-r border-r-solid [border-right-color:var(--border-subtle)] kit-interactive kit-focus-ring"
          >
            <span className="font-ui font-(--weight-semibold) [color:var(--text-secondary)] text-body/sm">
              −
            </span>
          </button>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            role="spinbutton"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuetext={unit ? `${format(value)} ${unit}` : undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={display}
            onChange={(e) => {
              setEditing(e.target.value);
              onValueString?.(e.target.value);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                onChange?.(value + step);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                onChange?.(value - step);
              } else if (e.key === "Enter") {
                e.preventDefault();
                commit((e.target as HTMLInputElement).value);
              }
            }}
            className="grow w-full min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro"
          />
          <button
            type="button"
            disabled={atMax}
            onClick={() => onChange?.(value + step)}
            aria-label="Increase"
            tabIndex={-1}
            className="flex items-center justify-center w-(--control-sm) h-(--control-md) shrink-0 border-l border-l-solid [border-left-color:var(--border-subtle)] kit-interactive kit-focus-ring"
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
      )}
    </FormField>
  );
}
