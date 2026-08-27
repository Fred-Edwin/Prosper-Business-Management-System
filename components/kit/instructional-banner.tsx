// Verbatim transcription of Paper artboard "Component Kit — Utility & Layout" (6WD-0):
// "Banner" (6Y2-0) — the numbered instructional banner. Display-only, single visual
// (component-states.md §2 C25). Neutral --surface-selected tint (distinct from the amber
// Calculated Impact banner — §6 D6), accent numbered circle, accent title, secondary body.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InstructionalBannerProps {
  /** The number shown in the accent circle. */
  step: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
  className?: string;
}

export function InstructionalBanner({
  step,
  title,
  body,
  className,
}: InstructionalBannerProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center py-(--sp-5) px-(--sp-6) rounded-md gap-(--sp-5) bg-(--surface-selected) antialiased",
        className,
      )}
    >
      <div className="flex items-center justify-center w-[28px] h-[28px] shrink-0 rounded-full bg-accent">
        <div className="font-ui font-(--weight-semibold) text-(--text-inverse) text-sm/micro">
          {step}
        </div>
      </div>
      <div className="flex flex-col gap-[2px]">
        <div className="font-ui font-(--weight-semibold) text-accent text-sm/sm">{title}</div>
        <div className="font-ui [color:var(--text-secondary)] text-caption/micro">{body}</div>
      </div>
    </div>
  );
}
