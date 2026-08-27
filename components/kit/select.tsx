// Verbatim REST transcription of Paper artboard "Component Kit — Form Controls"
// (6CG-0): "Select — Default" (6D2-0), "— Open" (9NU-0), "— Error" (9N9-0).
// Trigger + popover markup unchanged.
//
// Session 10 rewire — a real WAI-ARIA APG "Select-Only Listbox" (combobox):
//   - trigger opens on click AND on Down/Up/Enter/Space; when closed, typing a
//     letter opens + jumps (type-ahead).
//   - open: focus stays on the trigger; the active option is tracked via
//     aria-activedescendant. Up/Down/Home/End move the active option; Enter/Space
//     selects it + closes; Esc closes without selecting; Tab closes + selects.
//     Type-ahead within the open list too.
//   - options are role="option" with ids; the active one gets --surface-hover,
//     the selected one --surface-selected (§9.3/§9.4 via .kit-row[data-selected]
//     / [data-active]).
//   - raw shadow → --shadow-md; z-10 → --z-dropdown; label + helper via
//     <FormField>. API unchanged (`error?: boolean` + `helperText?`).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

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
  required?: boolean;
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
  required,
  disabled = false,
  className,
  id,
}: SelectProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const typeahead = React.useRef({ str: "", at: 0 });

  const selectedIdx = options.findIndex((o) => o.value === current);
  const selectedOption = selectedIdx >= 0 ? options[selectedIdx] : undefined;

  const commit = React.useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (!opt) return;
      if (!isControlled) setInternal(opt.value);
      onChange?.(opt.value);
    },
    [options, isControlled, onChange],
  );

  const openList = React.useCallback(() => {
    setOpen(true);
    setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
  }, [selectedIdx]);

  const closeList = React.useCallback(() => {
    setOpen(false);
    setActiveIdx(-1);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeList();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, closeList]);

  function typeaheadJump(char: string) {
    const now = Date.now();
    const t = typeahead.current;
    t.str = now - t.at > 600 ? char : t.str + char;
    t.at = now;
    const from = (open ? activeIdx : selectedIdx) + 1;
    const ordered = [...options.slice(from), ...options.slice(0, from)];
    const hit = ordered.find((o) =>
      o.label.toLowerCase().startsWith(t.str.toLowerCase()),
    );
    if (hit) {
      const idx = options.indexOf(hit);
      if (open) setActiveIdx(idx);
      else commit(idx);
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        typeaheadJump(e.key);
      }
      return;
    }
    // open
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIdx(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIdx(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIdx >= 0) commit(activeIdx);
        closeList();
        break;
      case "Escape":
        e.preventDefault();
        closeList();
        break;
      case "Tab":
        if (activeIdx >= 0) commit(activeIdx);
        closeList();
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          typeaheadJump(e.key);
        }
    }
  }

  const triggerBox = error
    ? "border border-solid border-danger"
    : open
      ? "border border-solid border-accent"
      : "border border-solid [border-color:var(--border-strong)]";

  return (
    <FormField
      label={label}
      error={error ? helperText || " " : undefined}
      hint={!error ? helperText : undefined}
      required={required}
      id={id}
      className={cn("w-[280px] relative", className)}
    >
      {({ id: triggerId, "aria-describedby": describedBy, "aria-invalid": invalid }) => (
        <div ref={rootRef} className="relative">
          <button
            id={triggerId}
            type="button"
            disabled={disabled}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-activedescendant={
              open && activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onClick={() => (open ? closeList() : openList())}
            onKeyDown={onTriggerKeyDown}
            className={cn(
              "flex items-center justify-between h-(--control-md) w-full px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) kit-field kit-focus-ring",
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
              aria-hidden
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
            <ul
              id={listboxId}
              role="listbox"
              aria-label={typeof label === "string" ? label : undefined}
              className="absolute left-0 top-full [z-index:var(--z-dropdown)] mt-[4px] flex h-fit rounded-md flex-col w-full p-[4px] gap-[2px] [box-shadow:var(--shadow-md)] bg-(--surface-page) border border-solid [border-color:var(--border-strong)] list-none"
            >
              {options.map((opt, i) => {
                const isSelected = opt.value === current;
                const isActive = i === activeIdx;
                return (
                  <li
                    key={opt.value}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected || undefined}
                    data-active={isActive || undefined}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => {
                      commit(i);
                      closeList();
                    }}
                    className={cn(
                      "flex items-center justify-between h-(--control-sm) px-(--sp-5) rounded-sm shrink-0 kit-row cursor-pointer",
                      isActive && !isSelected && "bg-(--surface-hover)",
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </FormField>
  );
}
