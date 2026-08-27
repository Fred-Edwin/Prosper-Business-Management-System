// Verbatim transcription of Paper artboard "Component Kit — Buttons & Actions" (6BR-0):
// the "Icon Button" frame (6CB-0) / "Icon button — default" (9L0-0) — identical markup in
// both the base row and the state row: a 32×32 rounded-sm box filled --surface-hover, with a
// 16×16 Lucide-style glyph inside (the `+` is the artboard's sample icon).
//
// The icon is a SLOT — callers pass the real Lucide icon as `children`. The sample `+` glyph
// is kept as the default so the gallery renders the artboard's exact drawing.
//
// hover (--surface-hover fill), focus-visible ring, disabled (--text-disabled glyph, no
// pointer) are design-principles.md §9 globals via .kit-interactive / .kit-focus-ring.
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
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <line
      x1="12"
      y1="5"
      x2="12"
      y2="19"
      stroke="var(--text-secondary)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="5"
      y1="12"
      x2="19"
      y2="12"
      stroke="var(--text-secondary)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
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
        "flex items-center justify-center w-[32px] h-[32px] shrink-0 rounded-sm [background-color:var(--surface-hover)]",
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
