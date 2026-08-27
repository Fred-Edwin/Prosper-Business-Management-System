// Verbatim REST transcription of Paper artboard "Component Kit — Form Controls"
// (6CG-0): "Text Input Row" (6CJ-0) default / focus / disabled + "Text Input —
// Error" (9ND-0). Box classes per state unchanged.
//
// Session 10 rewire:
//   - §9.2 focus border + §9.8 error border stay on the wrapper via `.kit-field`
//     + `data-invalid`. The label + helper/error row + `aria-describedby` /
//     `aria-invalid` wiring now come from <FormField> (§9.8 authored ONCE).
//   - raw `tracking-[0.04em]` label → `--tracking-caps` (inside <FormField>).
//   - API unchanged: `error?: boolean` + `helperText?: string` (screens depend
//     on it). Standalone (no `label`) still renders just the field box.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: boolean;
  /** Danger-colored helper row rendered below the field when set. */
  helperText?: string;
  required?: boolean;
}

export function TextInput({
  label,
  error = false,
  helperText,
  required,
  disabled = false,
  className,
  id,
  ...props
}: TextInputProps) {
  const box = error
    ? "bg-(--surface-page) border border-solid border-danger"
    : disabled
      ? "[background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)]"
      : "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]";

  return (
    <FormField
      label={label}
      error={error ? helperText || " " : undefined}
      hint={!error ? helperText : undefined}
      required={required}
      id={id}
      className="w-[280px]"
    >
      {({ id: controlId, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
        <div
          className={cn(
            "flex items-center h-(--control-md) px-(--sp-5) rounded-sm shrink-0 kit-field",
            box,
            className,
          )}
          data-invalid={invalid || undefined}
        >
          <input
            id={controlId}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cn(
              "font-ui text-sm/sm w-full bg-transparent outline-none",
              disabled
                ? "[color:var(--text-disabled)]"
                : "[color:var(--text-primary)]",
            )}
            {...props}
          />
        </div>
      )}
    </FormField>
  );
}
