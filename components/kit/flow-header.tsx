// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Flow Header" (9KI-0, with direction badge) and "Flow Header — No direction badge" (9TI-0).
// Same markup; the badge slot is either the "Origin → Destination" text or hidden
// (get_jsx emits `hidden ... text-info` on the no-badge frame). Bar = w-[390px]
// h-[48px] px-[16px] bg-(--surface-page) border-b [border-bottom-color:var(--border-subtle)],
// a 20×20 back chevron + a font-(--weight-semibold) text-h2/h2 title.
//
// `directionTone` (default "info", the 9KI-0 colour) added Session 4c: the Store Manager
// / Canteen flow screens (8XH-0 / 92M-0 / 9FE-0) colour the badge per flow —
// text-danger (Issue), text-success (Production), text-info (Transfer), text-warning
// (Non-Sale). Omitting it reproduces the kit artboard exactly. Follow-up Design Sprint:
// add the toned states to the 9KI-0 artboard.
//
// back pressed is the §9 global.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FlowHeaderProps {
  title: string;
  /** e.g. "Store → Kitchen". Omit for flows with no origin→destination. */
  direction?: string;
  /** Colour of the direction badge. Default "info" — the 9KI-0 kit artboard colour. */
  directionTone?: "info" | "success" | "danger" | "warning";
  onBack?: () => void;
  className?: string;
}

const DIRECTION_TONE_CLASS: Record<
  NonNullable<FlowHeaderProps["directionTone"]>,
  string
> = {
  info: "text-info",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

export function FlowHeader({
  title,
  direction,
  directionTone = "info",
  onBack,
  className,
}: FlowHeaderProps) {
  return (
    <header
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
          className="shrink-0 kit-interactive kit-focus-ring rounded-sm [--kit-hover-bg:var(--surface-hover)]"
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
        <div
          role="heading"
          aria-level={1}
          className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 [color:var(--text-primary)] text-h2/h2"
        >
          {title}
        </div>
      </div>
      <div
        className={cn(
          "font-ui font-(--weight-medium) inline-block w-max shrink-0 text-sm/micro",
          DIRECTION_TONE_CLASS[directionTone],
          !direction && "hidden",
        )}
      >
        {direction}
      </div>
    </header>
  );
}
