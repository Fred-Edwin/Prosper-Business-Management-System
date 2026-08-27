// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Flow Header" (9KI-0, with direction badge) and "Flow Header — No direction badge" (9TI-0).
// Same markup; the badge slot is either the info-colored "Origin → Destination" text or
// hidden (get_jsx emits `hidden ... text-info` on the no-badge frame). Bar = w-[390px]
// h-[48px] px-[16px] bg-(--surface-page) border-b [border-bottom-color:var(--border-subtle)],
// a 20×20 back chevron + a font-(--weight-semibold) text-h2/h2 title.
//
// back pressed is the §9 global.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FlowHeaderProps {
  title: string;
  /** e.g. "Store → Kitchen". Omit for flows with no origin→destination. */
  direction?: string;
  onBack?: () => void;
  className?: string;
}

export function FlowHeader({ title, direction, onBack, className }: FlowHeaderProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center justify-between w-[390px] h-[48px] shrink-0 px-[16px] bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)] antialiased text-caption/micro",
        className,
      )}
    >
      <div className="flex items-center gap-(--sp-4)">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 kit-interactive kit-focus-ring"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <line x1="19" y1="12" x2="5" y2="12" stroke="var(--text-primary)" strokeWidth="1.5" />
            <polyline points="12 19 5 12 12 5" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />
          </svg>
        </button>
        <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 [color:var(--text-primary)] text-h2/h2">
          {title}
        </div>
      </div>
      <div
        className={cn(
          "font-ui font-(--weight-medium) inline-block w-max shrink-0 text-info text-sm/micro",
          !direction && "hidden",
        )}
      >
        {direction}
      </div>
    </div>
  );
}
