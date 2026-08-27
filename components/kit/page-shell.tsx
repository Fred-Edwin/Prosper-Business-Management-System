// NEW primitive (Session 10 Deliverable 3d) — needs owner review in Storybook.
// NO Paper artboard — this has REAL layout decisions, surfaced for sign-off.
//
// The bug it fixes: every screen hand-rolls its own `max-w` / page padding and
// they diverge ("the stock body doesn't fill the viewport like catalog").
// <PageShell> owns:
//   - the content max width  → --content-max (1200px, the Paper admin Body frame)
//   - the page padding       → --sp-8 inline, --sp-7 block (matches the catalog
//                               reference screen's content region)
//   - an optional sticky toolbar row (title / actions), --z-sticky
//
// Screens adopt it next session (Session 11 rebuild). It renders no chrome of
// its own beyond the width + padding + toolbar slot — the shells
// (AdminShell / StaffShell) still own nav/header.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  /** Sticky toolbar content (title, filters, primary action). Omit for none. */
  toolbar?: React.ReactNode;
  /** Remove the default inline/block page padding (edge-to-edge content). */
  flush?: boolean;
  /** Widen past --content-max for genuinely full-bleed screens (wide ledgers). */
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function PageShell({
  toolbar,
  flush = false,
  wide = false,
  className,
  children,
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col grow min-h-0 w-full", className)}>
      {toolbar && (
        <div
          className={cn(
            "sticky top-0 flex items-center gap-(--sp-4) shrink-0 min-h-(--control-lg) py-(--sp-4) bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)]",
            "[z-index:var(--z-sticky)]",
            flush ? "px-(--sp-6)" : "px-(--sp-8)",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-(--sp-4) w-full",
              !wide && "max-w-(--content-max) mx-auto",
            )}
          >
            {toolbar}
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex flex-col grow min-h-0 w-full",
          !flush && "py-(--sp-7) px-(--sp-8)",
        )}
      >
        <div
          className={cn(
            "flex flex-col grow min-h-0 w-full",
            !wide && "max-w-(--content-max) mx-auto",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
