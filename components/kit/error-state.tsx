// Verbatim REST transcription of Paper artboard "Component Kit — Empty & Error
// States" (9U3-0): "ErrorState" (9UT-0). Same layout as EmptyState; 28×28
// warning-triangle stroked --color-danger; "Retry" secondary button.
//
// Session 10 rewire: Retry → kit <Button variant="secondary">. Container is
// role="alert" so the error is announced. off-scale literals → --sp-*. Icon
// aria-hidden.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

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
      role="alert"
      className={cn(
        "[font-synthesis:none] flex flex-col items-center py-(--sp-10) px-(--sp-8) rounded-md gap-(--sp-4) bg-(--surface-page) border border-solid [border-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
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
        <Button variant="secondary" onClick={onRetry} className="mt-(--sp-2)">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
