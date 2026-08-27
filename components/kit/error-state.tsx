// Verbatim transcription of Paper artboard "Component Kit — Empty & Error States" (9U3-0):
// "ErrorState" (9UT-0). Same layout as EmptyState; the icon is a 28×28 warning-triangle
// stroked var(--color-danger), and the action is the secondary "Retry" button
// (bg-(--surface-page) border border-solid [border-color:var(--border-strong)]).
//
//   container: flex flex-col items-center py-[40px] px-[24px] rounded-md gap-[8px]
//              bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]
//   title    : font-ui font-(--weight-semibold) text-center flex justify-center flex-wrap
//              [color:var(--text-primary)] text-body/sm
//   body     : font-ui text-center flex justify-center flex-wrap
//              [color:var(--text-secondary)] text-sm/sm
//   action   : h-[36px] mt-[4px] px-[16px] rounded-sm bg-(--surface-page) border border-solid
//              [border-color:var(--border-strong)] + primary-color label.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load this",
  description = "Something went wrong fetching the data. Check your connection and try again.",
  retryLabel = "Retry",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex flex-col items-center py-[40px] px-[24px] rounded-md gap-[8px] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)] antialiased text-caption/micro",
        className,
      )}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path
          d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          fill="none"
          stroke="var(--color-danger)"
          strokeWidth="1.5"
        />
        <line x1="12" y1="9" x2="12" y2="13" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="font-ui font-(--weight-semibold) text-center flex justify-center flex-wrap [color:var(--text-primary)] text-body/sm">
        {title}
      </div>
      <div className="font-ui text-center flex justify-center flex-wrap [color:var(--text-secondary)] text-sm/sm">
        {description}
      </div>
      {retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center justify-center h-[36px] mt-[4px] px-[16px] rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)] kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-medium) inline-block text-center [color:var(--text-primary)] text-sm/micro">
            {retryLabel}
          </span>
        </button>
      )}
    </div>
  );
}
