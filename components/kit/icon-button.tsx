// Verbatim REST transcription of Paper artboard "Component Kit — Buttons & Actions"
// (6BR-0): "Icon Button" (6CB-0) / "Icon button — default" (9L0-0) — a 32×32
// rounded-sm box filled --surface-hover with a 16×16 glyph slot.
//
// Session 10 rewire: §9.5 icon-button hover is --surface-hover (the .kit-interactive
// default — no --kit-hover-bg needed). §9.7 disabled via the shared rule + `disabled`
// attr (the redundant inline opacity is dropped). Focus ring via .kit-focus-ring.
// The icon is a SLOT — callers pass the real Lucide icon as `children`.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The 16×16 icon. Defaults to the artboard's `+` sample glyph. */
  children?: React.ReactNode;
  /** Accessible label — icon-only control, so this is required for a11y. */
  "aria-label": string;
}

const DefaultPlusGlyph = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <line x1="12" y1="5" x2="12" y2="19" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export function IconButton({
  children,
  className,
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center w-(--control-sm) h-(--control-sm) shrink-0 rounded-sm [background-color:var(--surface-hover)]",
        "kit-interactive kit-focus-ring",
        className,
      )}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      {...props}
    >
      {children ?? DefaultPlusGlyph}
    </button>
  );
}
