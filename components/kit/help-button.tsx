// NEW kit component (owner-approved 2026-09-06) — the "?" help affordance that
// sits in a shell header row. Same 32×32 rounded-sm box + §9 interaction states
// as <IconButton>, but ships its own question-mark glyph and a fixed
// aria-label so every shell wires it the same way. Opening a screen's help
// panel is its only job — it takes an onClick and an `open` flag (for the
// pressed/active tint while the panel is showing).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface HelpButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** True while the help panel is open — holds the button in its active tint. */
  active?: boolean;
}

const QuestionGlyph = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <path
      d="M9.1 9a3 3 0 1 1 4.4 2.6c-.9.5-1.5 1.1-1.5 2.4"
      fill="none"
      stroke="var(--text-secondary)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="12" cy="17.5" r="1" fill="var(--text-secondary)" />
  </svg>
);

export function HelpButton({ active, className, ...props }: HelpButtonProps) {
  return (
    <button
      type="button"
      aria-label="Help for this screen"
      aria-haspopup="dialog"
      aria-expanded={active || undefined}
      className={cn(
        "flex items-center justify-center w-(--control-sm) h-(--control-sm) shrink-0 rounded-sm",
        "kit-interactive kit-focus-ring [--kit-hover-bg:var(--surface-hover)]",
        active && "[background-color:var(--surface-selected)]",
        className,
      )}
      {...props}
    >
      {QuestionGlyph}
    </button>
  );
}
