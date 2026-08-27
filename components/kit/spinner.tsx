// NEW primitive (Session 10 Deliverable 3d) — needs owner review in Storybook.
// NO Paper artboard. The §9.10 inline spinner as a shared React component.
//
// The visual already exists in app/globals.css as `.kit-spinner` (14px ring,
// currentColor, 640ms rotate — the one reduced-motion exception is NOT applied
// here; a small rotating ring is not a vestibular trigger the way a wide shimmer
// is, and owner D4 said keep motion). This is just the wrapper + a11y.
//
// Used by <Button data-loading>, <MatchCard> submitting, any control in flight.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** `sm` = --icon-sm (14px, the §9.10 size, default). `md` = --icon-md (16px). */
  size?: "sm" | "md";
  /** Visually-hidden status text for screen readers. Default "Loading". */
  label?: string;
  className?: string;
}

export function Spinner({ size = "sm", label = "Loading", className }: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn(
        "kit-spinner",
        size === "md" && "w-(--icon-md) h-(--icon-md)",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
