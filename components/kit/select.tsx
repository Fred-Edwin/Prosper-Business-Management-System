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
//
// Kit searchable mode (kit-searchable-select-handoff.md, Phase B) — OPT-IN:
//   - `searchable` false (default): everything below is inert; behaviour is
//     byte-identical to Session 10. The `query` state is never written.
//   - `searchable` true: the open popover trigger is an APG "Editable Combobox
//     With List Autocomplete (none)" — the <input> carries role="combobox" /
//     aria-expanded / aria-controls / aria-activedescendant /
//     aria-autocomplete="list" / aria-invalid / aria-describedby; a 14px search
//     glyph sits left; the chevron is a decorative sibling and the whole field
//     toggles (documented — ADR-43 review item). Typing filters the option list
//     (`label` contains, case-insensitive); the popover is height-capped
//     (max-h = 8 × --control-md, per the 6CG-0 artboard's 288px) then scrolls;
//     an empty result renders one non-interactive `noMatchesLabel` row.
//     The non-searchable path keeps the <button role="combobox"> exactly.
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
  /**
   * Accessible name for the trigger when the component is used WITHOUT a
   * visible `label` (e.g. inside FilterToolbar, where the label lives in the
   * trigger text). Ignored when `label` is set — FormField wires the name
   * then. Additive / a11y-only (M2-3KIT-FILTER).
   */
  "aria-label"?: string;
  /**
   * When true, the open popover shows a text input that filters the option
   * list (label contains, case-insensitive). Default false — the component
   * behaves exactly as before.
   */
  searchable?: boolean;
  /**
   * Copy for the empty popover row when `searchable` and no option matches
   * the query. Default "No matches".
   */
  noMatchesLabel?: string;
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
  searchable = false,
  noMatchesLabel = "No matches",
  "aria-label": ariaLabel,
}: SelectProps) {
  // Only apply the fallback name when there is no visible label (FormField
  // wires aria-labelledby in that case).
  const triggerAriaLabel = label ? undefined : ariaLabel;
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listboxId = React.useId();
  const typeahead = React.useRef({ str: "", at: 0 });

  // Filtered list — only when searchable AND a query is present. Otherwise
  // `shown === options` (same reference) so every downstream index is unchanged.
  const shown = React.useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [searchable, query, options]);

  const selectedIdx = shown.findIndex((o) => o.value === current);
  const selectedOption = options.find((o) => o.value === current);

  const commit = React.useCallback(
    (idx: number) => {
      const opt = shown[idx];
      if (!opt) return;
      if (!isControlled) setInternal(opt.value);
      onChange?.(opt.value);
    },
    [shown, isControlled, onChange],
  );

  const openList = React.useCallback(() => {
    setOpen(true);
    setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
  }, [selectedIdx]);

  const closeList = React.useCallback(() => {
    setOpen(false);
    setActiveIdx(-1);
    if (searchable) setQuery("");
  }, [searchable]);

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

  // Searchable: focus the input on open + select its text so the user types
  // over it; keep the active option scrolled into view on Arrow nav.
  React.useEffect(() => {
    if (searchable && open) inputRef.current?.select();
  }, [searchable, open]);

  React.useEffect(() => {
    if (!searchable || !open || activeIdx < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `#${CSS.escape(`${listboxId}-opt-${activeIdx}`)}`,
    );
    el?.scrollIntoView?.({ block: "nearest" });
  }, [searchable, open, activeIdx, listboxId]);

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
      else commit(options.findIndex((o) => o.value === hit.value));
    }
  }

  // Shared open-state key handling for both the <button> and the searchable
  // <input>. `printableToInput` = true on the searchable path so the browser
  // handles the character (real filtering, no type-ahead jump).
  function onOpenKeyDown(e: React.KeyboardEvent, printableToInput: boolean) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(shown.length - 1, i + 1));
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
        setActiveIdx(shown.length - 1);
        break;
      case "Enter":
      case " ":
        // On the searchable path Space is a normal character in the input.
        if (e.key === " " && printableToInput) break;
        e.preventDefault();
        // No active option (e.g. searchable + no matches) ⇒ Enter is a no-op.
        if (activeIdx < 0 || !shown[activeIdx]) break;
        commit(activeIdx);
        closeList();
        break;
      case "Escape":
        e.preventDefault();
        // APG editable-combobox note: first Esc clears a non-empty query;
        // a second Esc (or Esc on an empty query) closes.
        if (printableToInput && query) {
          setQuery("");
          setActiveIdx(0);
        } else {
          closeList();
        }
        break;
      case "Tab":
        if (activeIdx >= 0 && shown[activeIdx]) commit(activeIdx);
        closeList();
        break;
      default:
        if (
          !printableToInput &&
          e.key.length === 1 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.altKey
        ) {
          typeaheadJump(e.key);
        }
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
    onOpenKeyDown(e, false);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    onOpenKeyDown(e, true);
  }

  const triggerBox = error
    ? "border border-solid border-danger"
    : open
      ? "border border-solid border-accent"
      : "border border-solid [border-color:var(--border-strong)]";

  const searchGlyph = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
      />
      <line
        x1="16.5"
        y1="16.5"
        x2="21"
        y2="21"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const chevron = (
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
  );

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
          {searchable && open ? (
            <div
              onClick={() => inputRef.current?.focus()}
              className={cn(
                "flex items-center h-(--control-md) w-full px-(--sp-5) gap-(--sp-4) rounded-sm shrink-0 bg-(--surface-page) kit-field",
                triggerBox,
              )}
            >
              {searchGlyph}
              <input
                ref={inputRef}
                id={triggerId}
                type="text"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  activeIdx >= 0 && shown[activeIdx]
                    ? `${listboxId}-opt-${activeIdx}`
                    : undefined
                }
                aria-label={triggerAriaLabel}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={query}
                placeholder={selectedOption ? selectedOption.label : placeholder}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!open) openList();
                  setActiveIdx(0);
                }}
                onKeyDown={onInputKeyDown}
                className="flex-1 min-w-0 bg-transparent outline-none font-ui text-sm/sm [color:var(--text-primary)] placeholder:[color:var(--text-secondary)] kit-focus-ring"
              />
              {chevron}
            </div>
          ) : (
            <button
              id={triggerId}
              type="button"
              disabled={disabled}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              aria-activedescendant={
                open && activeIdx >= 0
                  ? `${listboxId}-opt-${activeIdx}`
                  : undefined
              }
              aria-label={triggerAriaLabel}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onClick={() => (open ? closeList() : openList())}
              onKeyDown={onTriggerKeyDown}
              className={cn(
                "flex items-center justify-between h-(--control-md) w-full px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) kit-field kit-focus-ring",
                searchable && "gap-(--sp-4)",
                triggerBox,
              )}
            >
              {searchable && open && searchGlyph}
              <span
                className={cn(
                  "font-ui text-sm/sm",
                  searchable && "flex-1 min-w-0 text-left",
                  selectedOption
                    ? "[color:var(--text-primary)]"
                    : "[color:var(--text-tertiary)]",
                )}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              {chevron}
            </button>
          )}

          {open && (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={typeof label === "string" ? label : undefined}
              className={cn(
                // The popover is at LEAST as wide as the trigger, then grows
                // to fit the widest option (w-max) so long labels don't wrap,
                // capped so it never runs off a narrow viewport.
                "absolute left-0 top-full [z-index:var(--z-dropdown)] mt-[4px] flex rounded-md flex-col min-w-full w-max max-w-[min(90vw,26rem)] p-[4px] gap-[2px] [box-shadow:var(--shadow-md)] bg-(--surface-page) border border-solid [border-color:var(--border-strong)] list-none",
                searchable
                  ? "max-h-[calc(var(--control-md)*8)] overflow-y-auto"
                  : "h-fit",
              )}
            >
              {searchable && query && shown.length === 0 ? (
                <li
                  className="flex items-center justify-center h-(--control-sm) px-(--sp-5) shrink-0 font-ui text-sm/sm [color:var(--text-tertiary)]"
                  aria-hidden
                >
                  {noMatchesLabel}
                </li>
              ) : (
                shown.map((opt, i) => {
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
                        "flex items-center justify-between min-h-(--control-sm) py-[6px] px-(--sp-5) rounded-sm shrink-0 kit-row cursor-pointer",
                        isActive && !isSelected && "bg-(--surface-hover)",
                      )}
                    >
                      <span
                        className={cn(
                          "font-ui text-sm/sm whitespace-nowrap",
                          isSelected
                            ? "font-(--weight-medium) text-accent"
                            : "[color:var(--text-primary)]",
                        )}
                      >
                        {opt.label}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      )}
    </FormField>
  );
}
