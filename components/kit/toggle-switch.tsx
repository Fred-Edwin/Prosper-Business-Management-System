// Verbatim transcription of Paper artboard "Component Kit — Form Controls" (6CG-0):
// "Toggle Switch Row" (9K1-0, on + off) and "State Row — Toggle disabled" (9OD-0, on + off
// wrapped in opacity-[0.5]). Single track+knob markup merged behind props (checked / disabled).
//   on  : track bg-accent, knob has `ml-auto` (pushed right)
//   off : track [background-color:var(--border-strong)], knob at rest left
//   disabled: opacity-[0.5] on the row wrapper (per the artboard) — mirrored here onto the
//             control itself so a standalone toggle still dims.
//
// focus-visible ring (2px accent around the track) is the §9 global.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
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
        "flex items-center w-[40px] h-[22px] shrink-0 p-[2px] rounded-[11px] kit-interactive kit-focus-ring",
        isOn ? "bg-accent" : "[background-color:var(--border-strong)]",
        disabled && "opacity-[0.5]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "w-[18px] h-[18px] rounded-[50%] shrink-0 bg-white",
          isOn && "ml-auto",
        )}
      />
    </button>
  );
}
