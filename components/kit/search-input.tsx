// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Search Input" (6WK-0, default/placeholder) and "Search Input — Filled" (9RU-0, value +
// trailing ✕ clear). One markup block, switched by whether there is a value:
//   default : [background-color:var(--surface-hover)], placeholder text [color:var(--text-tertiary)]
//   filled  : bg-(--surface-page) border border-solid border-accent, value grow
//             [color:var(--text-primary)], trailing ✕ [color:var(--text-tertiary)] text-caption/sm
//
// focus ring is the §9 global. Search is never disabled in M1 (component-states.md §2 C8).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  defaultValue = "",
  onChange,
  onClear,
  placeholder = "Search products, movements…",
  className,
  ...props
}: SearchInputProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;
  const filled = current.length > 0;

  function update(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  function clear() {
    if (!isControlled) setInternal("");
    onChange?.("");
    onClear?.();
  }

  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center h-[32px] w-[280px] shrink-0 px-(--sp-5) rounded-sm gap-(--sp-3) antialiased kit-field",
        filled
          ? "bg-(--surface-page) border border-solid border-accent"
          : "[background-color:var(--surface-hover)]",
        className,
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
        <line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
          stroke="var(--text-tertiary)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        value={current}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "font-ui text-sm/sm grow bg-transparent outline-none",
          filled
            ? "[color:var(--text-primary)]"
            : "placeholder:[color:var(--text-tertiary)] [color:var(--text-primary)]",
        )}
        {...props}
      />
      {filled && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="font-ui shrink-0 [color:var(--text-tertiary)] text-caption/sm kit-focus-ring"
        >
          ✕
        </button>
      )}
    </div>
  );
}
