// Owner review 2026-09-23 (client feedback, live on the Dashboard at a
// ~1900px window): the original --content-max (1200px) cap — centered,
// dead space either side on anything wider than a laptop — was explicitly
// "flagged for owner review" when it shipped (DECISIONS.md, Session 10
// Deliverable 3d) and never actually finalized. Reviewed now and
// rejected: a page should fill and respond to the viewport, full stop —
// not center in a fixed column because a Paper frame happened to be
// 1200px. `wide` is kept as a no-op prop so the two call sites that
// already pass it (`stock-client.tsx`, `opening-client.tsx`) keep
// compiling unchanged; every screen now gets the same fill-the-viewport
// behavior regardless of whether it passes `wide`.
//
// <PageShell> still owns:
//   - the page padding → --sp-8 inline, --sp-7 block (matches the catalog
//                         reference screen's content region)
//   - an optional sticky toolbar row (title / actions), --z-sticky
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  /** Sticky toolbar content (title, filters, primary action). Omit for none. */
  toolbar?: React.ReactNode;
  /** Remove the default inline/block page padding (edge-to-edge content). */
  flush?: boolean;
  /** No-op — every screen fills the viewport now (owner review 2026-09-23).
   *  Kept only so existing call sites don't need editing. */
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function PageShell({
  toolbar,
  flush = false,
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
            flush ? "px-(--sp-6)" : "px-(--sp-6) md:px-(--sp-8)",
          )}
        >
          <div className="flex items-center gap-(--sp-4) w-full">
            {toolbar}
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex flex-col grow min-h-0 w-full",
          // Mobile bodies sit 16px from the edge (Paper `Dashboard — mobile
          // [v2]`, body paddingInline 16px); desktop keeps the signed-off 24px.
          !flush && "py-(--sp-7) px-(--sp-6) md:px-(--sp-8)",
        )}
      >
        <div className="flex flex-col grow min-h-0 w-full">{children}</div>
      </div>
    </div>
  );
}
