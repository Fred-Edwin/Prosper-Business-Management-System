// NEW kit component (M2-3KIT) — no prior artboard before this sprint.
// Visual acceptance target: Paper "Prosper Hotel" → "Shell+Component kit" →
// "Component Kit — Selectable Product Row [M2-3D]" (JL7-0), five states:
//   1 not selected · 2 selected (in batch) · 3 at available (+ disabled) ·
//   4 over available — BLOCKED (§9.8) · 5 zero available (row muted, inert).
//
// Why it exists: the owner reversed ADR-44's one-line-form body for the 6
// Store-Manager / Canteen movement flows (Receive, Issue, Production, Transfer,
// Non-sale, Canteen Dispatch). They now use a multi-row product picker; this
// row — product name · `Avail: N unit` readout · `+ Select` / inline stepper ·
// over-stock BLOCKED — appears in all 6, so it is a kit component, not a
// per-screen build. 3-DESIGN drew JL7-0; this session builds + gates it
// (ADR-42); then 3c / 3d compose it.
//
// Composition: `<Button size="sm">` for `+ Select`; tokens; the §9 shared CSS
// utilities (`.kit-row`, `.kit-focus-ring`, `.kit-interactive`) authored once
// in `app/globals.css`.
//
// DEVIATION from "compose the embedded stepper from `<QuantityStepper>`"
// (handover §3.1): JL7-0's embedded stepper is a compact variant — 108px slot,
// 32px tall, `--radius-md`, NO unit slot, NO `<FormField>` label/helper chrome.
// The kit `<QuantityStepper>` (C10) always renders inside `<FormField>` with a
// hard-coded `w-[220px]` wrapper, `--control-md` (36px) height and `--radius-sm`
// — none prop-overridable — which blows out the fixed-width trailing slot and
// breaks the cross-row column alignment that is a stated core contract of this
// component. So the compact `− [n] +` control is authored inline here, but it
// RE-USES the ADR-43 / ADR-48 QuantityStepper interaction contract verbatim:
//   - the value is a real `<input inputmode="decimal" role="spinbutton">` with
//     `aria-valuenow` / `-valuemin` / `-valuemax` / `-valuetext`;
//   - tap-to-type: focus the value, type a magnitude, commit on blur / Enter;
//   - `↑` / `↓` step by `step`; `−` / `+` are native `<button>` disabled at the
//     min / max bound via the shared §9.7 rule;
//   - `onQuantityString` mirrors `QuantityStepper.onValueString` — the raw
//     typed string escape hatch for the parent's validation.
// `<QuantityStepper>` itself is NOT changed.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface SelectableProductRowProps {
  productId: string;
  name: string;
  /** Unit for the `Avail:` readout text only, e.g. "kg" | "pcs". Never rendered inside the stepper. */
  unit: string;
  /** Derived balance at the staff member's location. `0` ⇒ the zero-available (inert) state. */
  available: number;
  /** In the batch. */
  selected: boolean;
  /** Current stepped magnitude. Only meaningful when `selected`. */
  quantity: number;
  onSelect: (productId: string) => void;
  onDeselect: (productId: string) => void;
  onQuantityChange: (productId: string, next: number) => void;
  /** Raw typed string before parse — mirrors `QuantityStepper.onValueString`, for the parent's validation. */
  onQuantityString?: (productId: string, raw: string) => void;
  /**
   * Fires whenever this row's blocked signal changes. `true` ⇒ `quantity`
   * exceeds `available` (§9.8): the row paints the danger treatment + a
   * helper line, and the parent flow MUST disable its sticky submit while
   * ANY row's signal is `true`. The parent owns the aggregate — this is a
   * per-row notification, not a global flag.
   */
  onBlockedChange?: (productId: string, blocked: boolean) => void;
  /** `Avail:` default · `On hand:` (Receive) · `In Rest.:` (Production). See the flow doc. */
  availableLabelPrefix?: string;
  /** Step / stepper default when `+ Select` is tapped. */
  step?: number;
  /** Lower bound for the stepper. Default `0` — stepping to `0` deselects the row. */
  min?: number;
  /**
   * Upper bound for the stepper `+` button and the `aria-valuemax`. Defaults to
   * `available` (the spend flows: Issue / Transfer / Non-sale / Dispatch). Pass
   * `Infinity` for the additive flows (Receive / Production) where quantity is
   * not bounded by on-hand.
   */
  max?: number;
  /** Hard-disable the whole row (distinct from the zero-available styling). */
  disabled?: boolean;
  className?: string;
}

function formatAvail(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function SelectableProductRow({
  productId,
  name,
  unit,
  available,
  selected,
  quantity,
  onSelect,
  onDeselect,
  onQuantityChange,
  onQuantityString,
  onBlockedChange,
  availableLabelPrefix = "Avail:",
  step = 1,
  min = 0,
  max,
  disabled = false,
  className,
}: SelectableProductRowProps) {
  const isZero = available === 0;
  const ceiling = max ?? available;
  const blocked = selected && quantity > available;
  const atCeiling = selected && !blocked && quantity >= ceiling;
  const atFloor = selected && quantity <= min;

  // §9.8 blocked signal — notify the parent (which owns the aggregate that
  // disables the sticky submit) only on a real transition.
  const lastBlocked = React.useRef(false);
  React.useEffect(() => {
    if (blocked !== lastBlocked.current) {
      lastBlocked.current = blocked;
      onBlockedChange?.(productId, blocked);
    }
  }, [blocked, productId, onBlockedChange]);
  // A row leaving the tree (deselected / filtered out) must not leave a stale
  // `true` behind in the parent's aggregate.
  React.useEffect(() => {
    return () => {
      if (lastBlocked.current) onBlockedChange?.(productId, false);
    };
  }, [productId, onBlockedChange]);

  const [editing, setEditing] = React.useState<string | null>(null);
  const display = editing ?? formatAvail(quantity);

  function commit(raw: string) {
    onQuantityString?.(productId, raw);
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n)) {
      setEditing(null);
      return;
    }
    if (n <= min) onDeselect(productId);
    else onQuantityChange(productId, n);
    setEditing(null);
  }

  function step_(delta: number) {
    const next = quantity + delta;
    if (next <= min) onDeselect(productId);
    else onQuantityChange(productId, next);
  }

  const availLabel = isZero
    ? "None on hand"
    : `${availableLabelPrefix} ${formatAvail(available)} ${unit}`;

  // ── zero available / hard-disabled: `+ Select` inert, row muted ──────────
  if (isZero || disabled) {
    return (
      <div
        role="group"
        aria-label={`${name}, ${availLabel}`}
        aria-disabled="true"
        className={cn(
          "[font-synthesis:none] antialiased flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px]",
          "bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]",
          "opacity-[0.5]",
          className,
        )}
      >
        <span className="grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
          {name}
        </span>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-tertiary)] text-micro/micro">
          {availLabel}
        </span>
        <span className="shrink-0 basis-[108px] flex justify-end">
          <Button size="sm" variant="secondary" disabled tabIndex={-1}>
            + Select
          </Button>
        </span>
      </div>
    );
  }

  // ── not selected: plain row + `+ Select` ────────────────────────────────
  if (!selected) {
    return (
      <div
        role="group"
        aria-label={`${name}, ${availLabel}`}
        className={cn(
          "[font-synthesis:none] antialiased flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px]",
          "bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]",
          className,
        )}
      >
        <span className="grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
          {name}
        </span>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-caption/micro">
          {availLabel}
        </span>
        <span className="shrink-0 basis-[108px] flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSelect(productId)}
          >
            + Select
          </Button>
        </span>
      </div>
    );
  }

  // ── selected: row tint + accent border + inline compact stepper ─────────
  // BLOCKED (§9.8) overlays: danger row treatment + a helper line under the row.
  return (
    <div
      role="group"
      aria-label={`${name}, ${availLabel}, quantity ${formatAvail(quantity)} ${unit}${
        blocked ? ", exceeds available stock" : ""
      }`}
      data-selected={!blocked || undefined}
      data-blocked={blocked || undefined}
      className={cn(
        "[font-synthesis:none] antialiased flex flex-col w-full min-h-[56px] p-[12px] rounded-lg gap-[6px] border border-solid",
        blocked
          ? "bg-danger-bg border-danger"
          : "bg-(--surface-selected) border-accent",
        className,
      )}
    >
      <div className="flex items-center gap-[8px]">
        <span className="grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
          {name}
        </span>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-micro/micro">
          {availLabel}
        </span>
        <span className="shrink-0 basis-[108px] flex justify-end">
          <div
            className={cn(
              "flex items-center h-[32px] rounded-md overflow-clip shrink-0 bg-(--surface-page) border border-solid",
              blocked ? "border-danger" : "[border-color:var(--border-strong)]",
            )}
          >
            <button
              type="button"
              disabled={atFloor}
              onClick={() => step_(-step)}
              aria-label="Decrease"
              tabIndex={-1}
              className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
            >
              −
            </button>
            <span
              className={cn(
                "flex items-center justify-center min-w-[48px] h-[30px] px-[4px] shrink-0",
                "border-x border-x-solid [border-color:var(--border-subtle)]",
              )}
            >
              <input
                type="text"
                inputMode="decimal"
                role="spinbutton"
                aria-label={`${name} quantity`}
                aria-valuenow={quantity}
                aria-valuemin={min}
                aria-valuemax={Number.isFinite(ceiling) ? ceiling : undefined}
                aria-valuetext={`${formatAvail(quantity)} ${unit}`}
                aria-invalid={blocked || undefined}
                value={display}
                onChange={(e) => {
                  setEditing(e.target.value);
                  onQuantityString?.(productId, e.target.value);
                }}
                onBlur={(e) => commit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    step_(step);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    step_(-step);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    commit((e.target as HTMLInputElement).value);
                  }
                }}
                className={cn(
                  "w-max min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-medium) [font-feature-settings:'tnum'] text-sm/micro",
                  blocked ? "text-danger" : "[color:var(--text-primary)]",
                )}
                style={{ width: `${Math.max(display.length, 2)}ch` }}
              />
            </span>
            <button
              type="button"
              disabled={atCeiling}
              onClick={() => step_(step)}
              aria-label="Increase"
              tabIndex={-1}
              className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
            >
              +
            </button>
          </div>
        </span>
      </div>

      {blocked && (
        <p className="font-ui font-(--weight-regular) text-danger text-caption/micro">
          Only {formatAvail(available)} {unit} on hand — reduce or remove this
          line.
        </p>
      )}
    </div>
  );
}
