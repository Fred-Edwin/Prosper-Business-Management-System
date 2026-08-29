// Verbatim REST transcription of Paper artboard "Component Kit — Form Controls"
// (6CG-0): "Toggle Switch Row" (9K1-0, on + off) + "State Row — Toggle disabled"
// (9OD-0). on = bg-accent track + knob right; off = --border-strong track + knob
// left; disabled = opacity. Layout unchanged.
//
// Session 10 rewire: knob `bg-white` → `bg-(--text-inverse)` (token). §9.7
// disabled via `disabled` attr + the shared rule (the inline `opacity-[0.5]` is
// kept because the ARTBOARD dims the whole row — mirrored onto the control so a
// standalone toggle still dims). role="switch" + aria-checked ✓; Space/Enter
// toggle (native <button>). A switch does not take arrow keys (APG).
//
// Session 10d: dropped `.kit-interactive` from the track. A switch is not a
// button-ish hover/press surface — the shared class's `transform` transition +
// `:active` background made the knob flick perceptibly on toggle. The track only
// needs its own `background-color` transition for the on/off colour change;
// `.kit-focus-ring` (§9.1) is kept. §9.7 disabled is the inline `opacity-[0.5]`
// + the `disabled` attr (which already removes pointer events).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

export function ToggleSwitch({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  className,
  ...props
}: ToggleSwitchProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked);
  const isOn = isControlled ? checked : internal;

  function toggle() {
    if (disabled) return;
    const next = !isOn;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "flex items-center w-[40px] h-[22px] shrink-0 p-[2px] rounded-full kit-focus-ring",
        "[transition:background-color_var(--dur-fast)_var(--ease-standard)]",
        isOn ? "bg-accent" : "[background-color:var(--border-strong)]",
        disabled && "opacity-[0.5] pointer-events-none",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "w-[18px] h-[18px] rounded-full shrink-0 bg-(--text-inverse)",
          isOn && "ml-auto",
        )}
      />
    </button>
  );
}
