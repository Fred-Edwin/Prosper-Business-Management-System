// NEW kit component (Session M2-3KIT-FILTER, ADR-42). Spec:
// docs/design/filter-toolbar.md. Visual acceptance target: Paper artboard
// L9O-0 ("Component Kit — Filter Toolbar [M2-3DF]"); model artboards IEA-0
// (desktop, inside I00-0 — the shipped merged-Sales screen) and IKW-0
// (mobile, inside IJ1-0). This component must match those pixel-for-pixel so
// Session 3e's retrofit of that screen is a visual no-op.
//
// It COMPOSES existing proven primitives — it adds no new primitive:
//   - Select        → the labelled dropdown controls (kind:"select")
//   - DatePicker     → the date chip (kind:"date"); leading calendar glyph
//   - native <input type="checkbox"> → a boolean the user reads as a nicety
//   - ToggleSwitch   → a boolean the user reads as on/off (the A1
//                      "Has balance" idiom; kind:"toggle")
//   - Button (tertiary) → the Reset link
//
// Contract highlights (see filter-toolbar.md §3):
//   - Controlled. Owns NO filter state — the screen holds the filter object
//     and re-queries. Mirrors Select / Tabs / PillFilter.
//   - Reset is RENDERED iff at least one control is off its default
//     (null-safe compare for kind:"date"). Click → onReset if given, else
//     onChange(id, default) for every non-default control.
//   - Value display is load-bearing: a control AT its default renders its
//     label --text-secondary / --weight-regular; a control OFF its default
//     renders --text-primary / --weight-medium. This is the ONLY "a filter
//     is on" signal on the control itself.
//   - Fixed-width slots (flex-shrink:0) so the row does not reflow as values
//     change (Paper guide: vertical-lane alignment).
//
// Mobile (< --bp-md, model IKW-0): the controls collapse to a
// horizontally-scrollable row of 32px chips + a trailing "More" chip that
// opens a BottomSheet of the overflow controls; the result count + Reset
// move to their own row below. The layout split is driven by
// `matchMedia("(max-width: <--bp-md - 1>)")`; a `layout` escape-hatch prop
// forces one side deterministically (Storybook's viewport global does not
// resize the test-runner page).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { tokens } from "@/app/design-system/tokens";
import { Button } from "./button";
import { BottomSheet, type BottomSheetState } from "./bottom-sheet";
import { DatePicker } from "./date-picker";
import { Select } from "./select";
import { ToggleSwitch } from "./toggle-switch";

// --- the props contract (filter-toolbar.md §3) --------------------------------

export type FilterControl =
  | {
      id: string;
      label: string;
      kind: "select";
      options: { value: string; label: string }[];
      value: string;
      default: string;
    }
  | {
      id: string;
      label: string;
      kind: "date";
      /** ISO-ish display string, e.g. "Today" / "Aug 24"; null = "all dates". */
      value: string | null;
      default: string | null;
    }
  | { id: string; label: string; kind: "toggle"; value: boolean; default: boolean };

export interface FilterToolbarProps {
  controls: FilterControl[];
  /** Called when a control changes. The screen updates its filter + re-queries. */
  onChange: (id: string, value: string | boolean | null) => void;
  /**
   * Optional. When given, the toolbar's Reset calls this once. When omitted,
   * Reset loops `onChange(id, default)` over every non-default control.
   */
  onReset?: () => void;
  resultCount: number;
  /** "orders" | "customers" | "movements" | "rows" | "assets" | … */
  resultNoun: string;
  /** Accessible name for the toolbar's role="search" region. Default "Filters". */
  "aria-label"?: string;
  /**
   * A screen's search field, when it has one (Assets, Customers). Rendered as
   * a SIBLING at the START of the toolbar row — it keeps its own state and
   * handler; it just shares the row and the Reset logic (the screen clears
   * its own search string when it handles reset). Not a FilterControl.
   */
  search?: React.ReactNode;
  /**
   * Layout override. "auto" (default) picks desktop / mobile from
   * `matchMedia("< --bp-md")`. "desktop" / "mobile" force one — used by the
   * Storybook stories so the visual-regression snapshot is deterministic
   * (the runner's viewport global does not resize the page).
   */
  layout?: "auto" | "desktop" | "mobile";
  className?: string;
}

// --- helpers -----------------------------------------------------------------

const MOBILE_MQ = `(max-width: ${Number.parseInt(tokens["--bp-md"], 10) - 1}px)`;

/** true when the viewport is below --bp-md. SSR-safe (starts false). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return isMobile;
}

/** null-safe "is this control at its default value?" */
function isDefault(c: FilterControl): boolean {
  return c.value === c.default;
}

/** Singularise the result noun for a count of 1 (naive -s / -es trim). */
function nounFor(noun: string, count: number): string {
  if (count === 1 && noun.endsWith("es")) return noun.slice(0, -2);
  if (count === 1 && noun.endsWith("s")) return noun.slice(0, -1);
  return noun;
}

/** The value shown on a control's trigger: "<Label>: <value>" for select,
 *  the value alone for date, the label alone for toggle. */
function triggerText(c: FilterControl): string {
  if (c.kind === "select") {
    const opt = c.options.find((o) => o.value === c.value);
    return `${c.label}: ${opt ? opt.label : c.value}`;
  }
  if (c.kind === "date") return c.value ?? "All dates";
  return c.label;
}

// --- the chevron / calendar glyphs (match IEA-0 / IKW-0 exactly) -------------

function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <polyline
        points="6 9 12 15 18 9"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth={size <= 12 ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- desktop control renderers ---------------------------------------------
//
// DEVIATIONS from L9O-0 / IEA-0, and why (see the output summary):
//  (a) select control — the kit `Select` trigger always renders its value in
//      `--text-primary` (no weight hook). L9O-0 draws an AT-DEFAULT select
//      label `--text-secondary` / --weight-regular. Injecting that tone would
//      mean forking `Select` (forbidden) or reimplementing an APG listbox in
//      the toolbar (a new primitive in spirit). Composed as-is; the "filter
//      is on" signal for a select is still carried by the value text itself
//      ("All" → a concrete value) + the Reset link appearing. Date + toggle
//      controls, which the toolbar renders itself, DO honour the tone rule.
//  (b) date control — the kit `DatePicker` trigger has a TRAILING calendar
//      glyph and a mono value; L9O-0 / IEA-0 show a LEADING glyph and a
//      ui-font value. Same fork-vs-reimplement trade-off. Composed as-is.
//  (c) date value type — `kind:"date"` carries a display string, `DatePicker`
//      wants a real `Date` (`selected` / `onSelect`). The toolbar bridges
//      what it can: it shows `value` (or "All dates") and reports the picked
//      day as an ISO `yyyy-mm-dd` string via `onChange`. The screen (3e)
//      owns the string↔Date mapping and passes `selected` through if it
//      wants the calendar pre-positioned.

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** A single desktop control. `onChange` is the toolbar's `onChange` bound to
 *  this control's id by the caller. */
function DesktopControl({
  control,
  onChange,
}: {
  control: FilterControl;
  onChange: (value: string | boolean | null) => void;
}) {
  if (control.kind === "select") {
    // Remap the options so the trigger reads "<Label>: <value>" and pass no
    // `label` so `Select` renders no label chrome — composition, not a fork.
    const opts = control.options.map((o) => ({
      value: o.value,
      label: `${control.label}: ${o.label}`,
    }));
    // No `label` prop → `Select` renders no label chrome (the toolbar wants
    // the label INSIDE the trigger, "<Label>: <value>"). The trigger's
    // accessible name then comes from its text content ("Cashier: All
    // cashiers") — a valid ARIA name source for a <button role="combobox">.
    return (
      <Select
        options={opts}
        value={control.value}
        onChange={(v) => onChange(v)}
        className="w-max shrink-0"
      />
    );
  }

  if (control.kind === "date") {
    // No `label` → `DatePicker` renders no label chrome (it would stack a
    // <div> above the trigger and break the single-line row). The trigger's
    // accessible name comes from its value text ("Today" / "Aug 23").
    return (
      <DatePicker
        value={triggerText(control)}
        onSelect={(d) => onChange(isoDay(d))}
        className="w-max shrink-0"
      />
    );
  }

  // kind === "toggle" — the A1 "Has balance" idiom: a --weight-medium label
  // + the 40×22 kit ToggleSwitch, sharing the row.
  const toggleLabelId = `ft-toggle-${control.id}`;
  return (
    <div className="flex items-center h-(--control-md) gap-(--sp-4) shrink-0">
      <span
        id={toggleLabelId}
        className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm whitespace-nowrap"
      >
        {control.label}
      </span>
      <ToggleSwitch
        checked={control.value}
        onChange={(v) => onChange(v)}
        aria-labelledby={toggleLabelId}
      />
    </div>
  );
}

// --- mobile chip renderers -------------------------------------------------

function MobileChip({
  control,
  onOpen,
}: {
  control: FilterControl;
  onOpen: () => void;
}) {
  const atDefault = isDefault(control);
  // Chip label: the VALUE when set (--text-primary / --weight-medium), the
  // CONTROL NAME when at default (--text-secondary / --weight-regular).
  const text =
    control.kind === "toggle"
      ? control.label
      : atDefault
        ? control.label
        : control.kind === "select"
          ? (control.options.find((o) => o.value === control.value)?.label ?? control.value)
          : (control.value ?? control.label);
  const tone =
    atDefault && control.kind !== "date"
      ? "[color:var(--text-secondary)] font-(--weight-regular)"
      : "[color:var(--text-primary)] font-(--weight-medium)";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${control.label}: ${triggerText(control)}`}
      className={cn(
        "flex items-center h-[32px] shrink-0 px-(--sp-4) rounded-sm gap-(--sp-2) whitespace-nowrap",
        "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]",
        "kit-field kit-focus-ring",
      )}
    >
      <span className={cn("font-ui text-sm/sm w-max shrink-0", tone)}>{text}</span>
      {control.kind !== "toggle" && <Chevron size={12} />}
    </button>
  );
}

// --- the component -------------------------------------------------------------

export function FilterToolbar({
  controls,
  onChange,
  onReset,
  resultCount,
  resultNoun,
  "aria-label": ariaLabel = "Filters",
  search,
  layout = "auto",
  className,
}: FilterToolbarProps) {
  const autoMobile = useIsMobile();
  const mobile = layout === "auto" ? autoMobile : layout === "mobile";

  const anyOffDefault = controls.some((c) => !isDefault(c));
  const showReset = anyOffDefault;

  const doReset = React.useCallback(() => {
    if (onReset) {
      onReset();
      return;
    }
    for (const c of controls) {
      if (!isDefault(c)) onChange(c.id, c.default);
    }
  }, [onReset, controls, onChange]);

  const countText = `${resultCount} ${nounFor(resultNoun, resultCount)}`;

  // ---- mobile ----------------------------------------------------------------
  const [sheet, setSheet] = React.useState<BottomSheetState>("closed");

  if (mobile) {
    // Which controls sit inline vs behind "More": inline = the first 3 that
    // fit the chip row comfortably (IKW-0 shows 3 + More); the rest go in the
    // sheet. Off-default controls are surfaced first so an active filter is
    // never hidden behind More.
    const ordered = [...controls].sort(
      (a, b) => Number(isDefault(a)) - Number(isDefault(b)),
    );
    const INLINE = 3;
    const inline = ordered.slice(0, INLINE);
    const overflow = ordered.slice(INLINE);

    return (
      <section
        role="search"
        aria-label={ariaLabel}
        className={cn("flex flex-col w-full", className)}
      >
        <div
          data-ft-scroll
          className={cn(
            "flex items-center w-full overflow-x-auto",
            "py-(--sp-4) px-(--sp-5) gap-(--sp-3)",
          )}
        >
          {search && <div className="shrink-0">{search}</div>}
          {inline.map((c) => (
            <MobileChip key={c.id} control={c} onOpen={() => setSheet("open")} />
          ))}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setSheet("open")}
              className={cn(
                "flex items-center h-[32px] shrink-0 px-(--sp-4) rounded-sm whitespace-nowrap",
                "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]",
                "font-ui text-sm/sm [color:var(--text-secondary)] font-(--weight-regular)",
                "kit-field kit-focus-ring",
              )}
            >
              More
            </button>
          )}
        </div>

        <div
          className="flex items-center justify-between pb-(--sp-3) px-(--sp-5)"
          aria-live="polite"
        >
          <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
            {countText}
          </span>
          {showReset && (
            <Button
              variant="tertiary"
              size="sm"
              data-ft-reset
              onClick={doReset}
              className="h-auto px-0 [--kit-hover-bg:transparent]"
            >
              Reset
            </Button>
          )}
        </div>

        {/* "More" reveals the overflow controls as full-width rows in a
            BottomSheet — the staff-shell's standard overflow affordance
            (IKW-0 does not draw the reveal; BottomSheet is the proven kit
            primitive for it). All controls are offered here, not just the
            overflow ones, so the sheet is a complete filter editor. */}
        <BottomSheet
          state={sheet}
          onStateChange={setSheet}
          title="Filters"
        >
          <div className="flex flex-col gap-(--sp-6) pb-(--sp-6)">
            {controls.map((c) => (
              <div key={c.id} className="flex flex-col gap-(--sp-3)">
                <DesktopControl control={c} onChange={(v) => onChange(c.id, v)} />
              </div>
            ))}
            {showReset && (
              <Button variant="tertiary" size="sm" onClick={doReset} className="self-start">
                Reset
              </Button>
            )}
          </div>
        </BottomSheet>
      </section>
    );
  }

  // ---- desktop -------------------------------------------------------------
  return (
    <section
      role="search"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center w-full py-(--sp-6) gap-(--sp-4)",
        className,
      )}
    >
      {search && <div className="shrink-0">{search}</div>}

      {controls.map((c) => (
        <DesktopControl
          key={c.id}
          control={c}
          onChange={(v) => onChange(c.id, v)}
        />
      ))}

      {/* flex spacer — pushes the count + Reset cluster to the right */}
      <div className="grow" />

      <div className="flex items-center gap-(--sp-4) shrink-0" aria-live="polite">
        <span className="font-ui [color:var(--text-tertiary)] text-sm/sm whitespace-nowrap">
          {countText}
        </span>
        {showReset && (
          <>
            <span className="font-ui [color:var(--text-tertiary)] text-sm/micro" aria-hidden>
              ·
            </span>
            <Button
              variant="tertiary"
              size="sm"
              data-ft-reset
              onClick={doReset}
              className="h-auto px-0 [--kit-hover-bg:transparent]"
            >
              Reset
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
