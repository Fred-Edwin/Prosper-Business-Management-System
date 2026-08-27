// Verbatim REST transcription of Paper artboard "Component Kit — Utility & Layout"
// (6WD-0): "Search Input" (6WK-0, default) + "— Filled" (9RU-0, value + ✕ clear).
// Box classes per state unchanged.
//
// Session 10 rewire:
//   - the input gets an accessible name (`aria-label`, default "Search") — it had
//     only a placeholder before (axe: input needs a name).
//   - `role="search"` on the wrapper so it's a landmark.
//   - Escape clears (APG search convention) when there's a value.
//   - `.kit-field` for the §9.2 focus border; `.kit-focus-ring` on the ✕.
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
  /** Accessible name for the input. Default "Search". */
  "aria-label"?: string;
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
  const ariaLabel = props["aria-label"] ?? "Search";

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
      role="search"
      className={cn(
        "[font-synthesis:none] flex items-center h-(--control-sm) w-[280px] shrink-0 px-(--sp-5) rounded-sm gap-(--sp-3) antialiased kit-field",
        filled
          ? "bg-(--surface-page) border border-solid border-accent"
          : "[background-color:var(--surface-hover)]",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={current}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && filled) {
            e.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "font-ui text-sm/sm grow bg-transparent outline-none [appearance:none] [&::-webkit-search-cancel-button]:hidden",
          "placeholder:[color:var(--text-tertiary)] [color:var(--text-primary)]",
        )}
        {...props}
      />
      {filled && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="font-ui shrink-0 [color:var(--text-tertiary)] text-caption/sm kit-focus-ring rounded-sm"
        >
          ✕
        </button>
      )}
    </div>
  );
}
