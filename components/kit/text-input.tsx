// Verbatim transcription of Paper artboard "Component Kit — Form Controls" (6CG-0):
// "Text Input Row" (6CJ-0) default / focus / disabled + "Text Input — Error" (9ND-0).
// Field + label + optional helper markup merged behind props (disabled / error / helperText).
//
// FLAG (raw literal translated): the "Text Input — Focus" frame emits
// `[border-width:1.5px] border-[oklch(28.4%_0.126_296.2)]` — a raw OKLCH the Session 2 audit
// noted. Per design-principles.md §9.2 the focus border is `1px solid var(--color-accent)`
// applied on any focus; encoded once in globals.css via `.kit-field`. This component opts in
// with `.kit-field` rather than re-emitting the raw value. Noted in docs/PROGRESS.md.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: boolean;
  /** Danger-colored helper row rendered below the field when set. */
  helperText?: string;
}

export function TextInput({
  label,
  error = false,
  helperText,
  disabled = false,
  className,
  id,
  ...props
}: TextInputProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;

  // Box classes — exact strings from each state's get_jsx.
  let box: string;
  if (error) {
    box =
      "bg-(--surface-page) border border-solid border-danger";
  } else if (disabled) {
    box =
      "[background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)]";
  } else {
    box =
      "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]";
  }

  return (
    <div className="[font-synthesis:none] flex flex-col w-[280px] gap-[6px] shrink-0 antialiased">
      {label && (
        <label
          htmlFor={inputId}
          className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 kit-field",
          box,
          className,
        )}
        data-invalid={error || undefined}
      >
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            "font-ui text-sm/sm w-full bg-transparent outline-none",
            disabled
              ? "[color:var(--text-disabled)]"
              : "[color:var(--text-primary)]",
          )}
          {...props}
        />
      </div>
      {helperText && (
        <div className="font-ui font-(--weight-regular) text-danger text-caption/micro">
          {helperText}
        </div>
      )}
    </div>
  );
}
