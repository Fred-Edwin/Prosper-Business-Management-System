import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function ToggleSwitch({ checked, onChange, disabled, className, ...props }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[22px] w-10 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-accent" : "bg-border-strong",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "size-[18px] shrink-0 rounded-full bg-white transition-transform",
          checked && "ml-auto",
        )}
      />
    </button>
  );
}
