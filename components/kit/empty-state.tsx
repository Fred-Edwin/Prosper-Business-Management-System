// Verbatim REST transcription of Paper artboard "Component Kit — Empty & Error
// States" (9U3-0): "EmptyState — Default" (9U9-0) + "— Filtered / no results"
// (9UJ-0). The 17th kit area (ADR-36d, design-principles.md §7). Layout unchanged.
//
// Session 10 rewire: the action button is now the kit <Button> (variant primary
// for default, secondary for filtered) so §9.5/§9.7/§9.10 come from one place
// (was hand-rolled markup with a hard-coded `text-white`). off-scale literals
// (py-[40px], px-[24px], gap-[8px]) → --sp-* (40=--sp-10, 24=--sp-8, 8=--sp-4).
// The container is role="status" so a filter change is announced. Icon aria-hidden.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type EmptyStateVariant = "default" | "filtered";

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Override the icon. Defaults to the artboard glyph for the variant. */
  icon?: React.ReactNode;
  className?: string;
}

const BOX_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
    <path d="M3 7l3-4h12l3 4" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
  </svg>
);

const SEARCH_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="7" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export function EmptyState({
  variant = "default",
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  const resolvedIcon = icon ?? (variant === "filtered" ? SEARCH_ICON : BOX_ICON);

  return (
    <div
      role="status"
      className={cn(
        "[font-synthesis:none] flex flex-col items-center py-(--sp-10) px-(--sp-8) rounded-md gap-(--sp-4) bg-(--surface-page) border border-solid [border-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      {resolvedIcon}
      <div className="font-ui font-(--weight-semibold) text-center flex justify-center flex-wrap [color:var(--text-primary)] text-body/sm">
        {title}
      </div>
      <div className="font-ui text-center flex justify-center flex-wrap [color:var(--text-secondary)] text-sm/sm">
        {description}
      </div>
      {actionLabel && (
        <Button
          variant={variant === "filtered" ? "secondary" : "primary"}
          onClick={onAction}
          className="mt-(--sp-2)"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
