// Verbatim REST transcription of Paper artboard "Component Kit — Utility & Layout"
// (6WD-0): "Textarea" (6XO-0) — label + a h-[72px] p-(--sp-5) rounded-sm box,
// border --border-strong. Focus (accent border) + error (danger border + helper)
// per component-states.md §2 C4.
//
// Session 10 rewire: label + helper/error row + aria wiring via <FormField>
// (§9.8 authored once); `.kit-field` on the box for §9.2 / §9.8 borders.
// API unchanged (`error?: boolean` + `helperText?: string`).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
}

export function Textarea({
  label,
  error = false,
  helperText,
  required,
  disabled = false,
  className,
  id,
  ...props
}: TextareaProps) {
  return (
    <FormField
      label={label}
      error={error ? helperText || " " : undefined}
      hint={!error ? helperText : undefined}
      required={required}
      id={id}
      className="w-[340px]"
    >
      {({ id: controlId, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
        <div
          className={cn(
            "flex h-[72px] p-(--sp-5) rounded-sm shrink-0 border border-solid kit-field",
            error ? "border-danger" : "[border-color:var(--border-strong)]",
            className,
          )}
          data-invalid={invalid || undefined}
        >
          <textarea
            id={controlId}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className="font-ui [color:var(--text-primary)] text-sm/sm w-full h-full resize-none bg-transparent outline-none"
            {...props}
          />
        </div>
      )}
    </FormField>
  );
}
