// NEW primitive (Session 10 Deliverable 3d) — needs owner review in Storybook.
// NO Paper artboard. Wraps the §9.8 error pattern into ONE component so it is
// not re-authored per drawer / per field.
//
// design-principles.md §9.8: label + control + a helper/error text row directly
// below in var(--color-danger) / var(--text-caption) / var(--leading-caption),
// margin-top var(--sp-2). One pattern for every field type.
//
// FormField owns: the <label>, the helper/error <p>, and the aria-describedby /
// aria-invalid wiring. It does NOT style the control — the control still opts
// into `.kit-field` itself. Field components (TextInput / Textarea / Select /
// QuantityStepper) render their bare control via the render-prop so ids/aria
// line up; they also still work standalone.
//
// The kit field components keep their existing `error?: boolean` +
// `helperText?: string` API (screens depend on it) — they translate that into
// FormField's `error` string here.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldRenderArgs {
  /** Put on the control. */
  id: string;
  /** Put on the control — space-separated id list, or undefined. */
  "aria-describedby": string | undefined;
  /** Put on the control when the field is in error. */
  "aria-invalid": true | undefined;
}

export interface FormFieldProps {
  label?: React.ReactNode;
  /** Neutral helper text (shown when not in error). */
  hint?: React.ReactNode;
  /** In-error message. When set, replaces the hint and flags the control. */
  error?: React.ReactNode;
  /** Mark the label with a required asterisk. */
  required?: boolean;
  /** Explicit id for the control; auto-generated otherwise. */
  id?: string;
  /** Fixed width class from the field component (e.g. "w-[280px]"). */
  className?: string;
  /** Render the bare control, wired with the passed id / aria props. */
  children: (args: FormFieldRenderArgs) => React.ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  required,
  id,
  className,
  children,
}: FormFieldProps) {
  const reactId = React.useId();
  const controlId = id ?? `ff-${reactId}`;
  const msgId = `${controlId}-msg`;
  const hasError = error != null && error !== false;
  const message = hasError ? error : hint;
  const describedBy = message ? msgId : undefined;

  return (
    <div className={cn("[font-synthesis:none] flex flex-col gap-[6px] antialiased", className)}>
      {label && (
        <label
          htmlFor={controlId}
          className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-secondary)] text-caption/micro"
        >
          {label}
          {required && (
            <span aria-hidden className="text-danger ml-[2px]">
              *
            </span>
          )}
        </label>
      )}

      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": hasError ? true : undefined,
      })}

      {message && (
        <p
          id={msgId}
          className={cn(
            "font-ui font-(--weight-regular) text-caption/micro mt-(--sp-1)",
            hasError ? "text-danger" : "[color:var(--text-secondary)]",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
