// Verbatim transcription of Paper artboard "Component Kit — Form Controls" (6CG-0):
// "Select — Default" (6D2-0), "Select — Open" (9NU-0), "Select — Error" (9N9-0).
// Trigger + optional popover + optional helper markup merged behind props; open/close,
// Esc-to-close and click-outside are the minimal real behaviour §B1 allows for an
// interactive primitive. Controlled (value + onChange) and uncontrolled (defaultValue).
//
// filled / disabled / keyboard focus-ring are design-principles.md §9 globals.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  label,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select a location…",
  error = false,
  helperText,
  disabled = false,
  className,
  id,
}: SelectProps) {
  const reactId = React.useId();
  const triggerId = id ?? reactId;
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === current);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  // Trigger box classes — exact strings from each state's get_jsx.
  const triggerBox = error
    ? "bg-(--surface-page) border border-solid border-danger"
    : open
      ? "bg-(--surface-page) border border-solid border-accent"
      : "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]";

  return (
    <div
      ref={rootRef}
      className={cn(
        "[font-synthesis:none] flex flex-col w-[280px] gap-[6px] shrink-0 antialiased relative",
        className,
      )}
    >
      {label && (
        <label
          htmlFor={triggerId}
          className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro"
        >
          {label}
        </label>
      )}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error || undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 kit-field kit-focus-ring",
          triggerBox,
        )}
      >
        <span
          className={cn(
            "font-ui text-sm/sm",
            selectedOption
              ? "[color:var(--text-primary)]"
              : "[color:var(--text-tertiary)]",
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={
            open
              ? { rotate: "180deg", flexShrink: 0, transformOrigin: "50% 50%" }
              : { flexShrink: 0 }
          }
        >
          <polyline
            points="6 9 12 15 18 9"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-10 mt-[4px] flex justify-start h-fit rounded-md flex-col w-[280px] p-[4px] gap-[2px] [box-shadow:#00000014_0px_4px_12px] bg-(--surface-page) border border-solid [border-color:var(--border-strong)]"
        >
          {options.map((opt) => {
            const isSelected = opt.value === current;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => pick(opt.value)}
                className={cn(
                  "flex items-center justify-between h-[32px] px-(--sp-5) rounded-sm shrink-0 kit-row cursor-pointer",
                  isSelected && "bg-(--surface-selected)",
                )}
              >
                <span
                  className={cn(
                    "font-ui text-sm/sm",
                    isSelected
                      ? "font-(--weight-medium) text-accent"
                      : "[color:var(--text-primary)]",
                  )}
                >
                  {opt.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {helperText && (
        <div className="font-ui font-(--weight-regular) text-danger text-caption/micro">
          {helperText}
        </div>
      )}
    </div>
  );
}
