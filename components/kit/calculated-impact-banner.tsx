// Verbatim transcription of Paper artboard "Component Kit — Banners & Cards" (6SB-0):
// "Calculated Impact Banner" (9K9-0). Display-only, single visual (component-states.md §2 C23).
//
//   container: flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-warning-bg
//   icon     : 16×16 warning circle-i svg, inline style { flexShrink: 0, marginTop: 2px }
//   text     : font-ui inline-block text-warning text-sm/sm
//
// §6 D5 / D6: this is the amber warning-bg consequence-preview banner, deliberately distinct
// from the neutral --surface-selected numbered InstructionalBanner. The artboard's frame is
// w-[600px]; width is left to the caller here (the frame width is not a component constraint).
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CalculatedImpactBannerProps {
  children: React.ReactNode;
  className?: string;
}

export function CalculatedImpactBanner({
  children,
  className,
}: CalculatedImpactBannerProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-warning-bg antialiased text-caption/micro",
        className,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" />
        <line x1="12" y1="8" x2="12" y2="12" stroke="var(--color-warning)" strokeWidth="1.5" />
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--color-warning)" strokeWidth="1.5" />
      </svg>
      <div className="font-ui inline-block text-warning text-sm/sm">{children}</div>
    </div>
  );
}
