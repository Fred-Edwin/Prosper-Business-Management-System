// Verbatim transcription of Paper artboard "Component Kit — Empty & Error States" (9U3-0):
// "EmptyState — Default" (9U9-0) and "EmptyState — Filtered / no results" (9UJ-0). The 17th
// kit area (ADR-36d, design-principles.md §7).
//
//   container: flex flex-col items-center py-[40px] px-[24px] rounded-md gap-[8px]
//              bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]
//   icon     : 28×28 svg, stroke var(--text-tertiary); default = box glyph,
//              filtered = search glyph
//   title    : font-ui font-(--weight-semibold) text-center flex justify-center flex-wrap
//              [color:var(--text-primary)] text-body/sm
//   body     : font-ui text-center flex justify-center flex-wrap
//              [color:var(--text-secondary)] text-sm/sm
//   action   : h-[36px] mt-[4px] px-[16px] rounded-sm; default → bg-accent + white label
//              (font-(--weight-medium) text-sm/micro); filtered → bg-(--surface-page)
//              border border-solid [border-color:var(--border-strong)] + primary-color label.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
  <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
    <path d="M3 7l3-4h12l3 4" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
  </svg>
);

const SEARCH_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
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
      className={cn(
        "[font-synthesis:none] flex flex-col items-center py-[40px] px-[24px] rounded-md gap-[8px] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)] antialiased text-caption/micro",
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
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "flex items-center justify-center h-[36px] mt-[4px] px-[16px] rounded-sm shrink-0 kit-interactive kit-focus-ring",
            variant === "filtered"
              ? "bg-(--surface-page) border border-solid [border-color:var(--border-strong)]"
              : "bg-accent",
          )}
        >
          <span
            className={cn(
              "font-ui font-(--weight-medium) inline-block text-center text-sm/micro",
              variant === "filtered" ? "[color:var(--text-primary)]" : "text-white",
            )}
          >
            {actionLabel}
          </span>
        </button>
      )}
    </div>
  );
}
