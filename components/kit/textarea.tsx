// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Textarea" (6XO-0) — label + a h-[72px] p-(--sp-5) rounded-sm box, border --border-strong.
// focus (accent border) and error (danger border + danger helper) states were added to Form
// Controls per component-states.md §2 C4 but follow the shared §9.2 / §9.8 patterns:
// focus border via .kit-field, error border + helper via the same danger pattern as
// text-input. disabled is the §9.7 global.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean;
  helperText?: string;
}

export function Textarea({
  label,
  error = false,
  helperText,
  disabled = false,
  className,
  id,
  ...props
}: TextareaProps) {
  const reactId = React.useId();
  const areaId = id ?? reactId;

  return (
    <div className="[font-synthesis:none] flex flex-col w-[340px] gap-[6px] shrink-0 antialiased">
      {label && (
        <label
          htmlFor={areaId}
          className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex h-[72px] p-(--sp-5) rounded-sm shrink-0 border border-solid kit-field",
          error ? "border-danger" : "[border-color:var(--border-strong)]",
          className,
        )}
        data-invalid={error || undefined}
      >
        <textarea
          id={areaId}
          disabled={disabled}
          aria-invalid={error || undefined}
          className="font-ui [color:var(--text-primary)] text-sm/sm w-full h-full resize-none bg-transparent outline-none"
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
