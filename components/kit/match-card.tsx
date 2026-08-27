// Verbatim transcription of Paper artboard "Component Kit — Banners & Cards" (6SB-0):
//   "Match Card" (6ST-0)          — awaiting: pill bg-(--surface-selected)/text-accent
//                                   "Paid by Admin"; bottom bar bg-accent + white
//                                   "1-Tap Match & Receive (+…)" button.
//   "Match Card — Matched" (9QX-0) — pill bg-success-bg/text-success "Received"; bottom bar
//                                   bg-success-bg + text-success result text.
//   "Match Card — Flagged" (9RA-0) — pill bg-warning-bg/text-warning "Variance"; bottom bar
//                                   bg-warning-bg + text-warning result text; adds a
//                                   whitespace-pre-wrap "Expected · Received" detail line.
//
// Shared markup:
//   container: flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) border border-solid
//              [border-color:var(--border-subtle)]
//   header   : supplier font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm +
//              a pill: flex items-center h-[20px] px-[6px] rounded-sm, label
//              font-(--weight-medium) text-[10px] uppercase tracking-[0.04em] leading-[12px]
//   details  : flex flex-col gap-[2px], each line font-ui [color:var(--text-secondary)]
//              text-sm/sm
//   bottom   : flex items-center justify-center h-[36px] rounded-sm shrink-0
//
// Session 10 rewire: the "awaiting" action is the kit <Button variant="primary">
// (§9.5 hover → --color-accent-hover, §9.10 loading via `submitting`), not
// hand-rolled markup with a hard-coded `text-white`. Container role="listitem"
// (it lives in the reconciliation list). raw tracking-[0.04em] → --tracking-caps.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type MatchCardStatus = "awaiting" | "matched" | "flagged";

export interface MatchCardProps {
  supplier: string;
  details: string[];
  status: MatchCardStatus;
  /** awaiting: the button label, e.g. "1-Tap Match & Receive (+50.0 kg)". */
  actionLabel?: string;
  onAction?: () => void;
  /** awaiting: 1-tap match in flight. */
  submitting?: boolean;
  /** matched / flagged: the result-bar text, e.g. "Matched & received  ·  +50.0 kg". */
  resultLabel?: string;
  className?: string;
}

const PILL: Record<MatchCardStatus, { box: string; text: string; label: string }> = {
  awaiting: { box: "bg-(--surface-selected)", text: "text-accent", label: "Paid by Admin" },
  matched: { box: "bg-success-bg", text: "text-success", label: "Received" },
  flagged: { box: "bg-warning-bg", text: "text-warning", label: "Variance" },
};

export function MatchCard({
  supplier,
  details,
  status,
  actionLabel,
  onAction,
  submitting = false,
  resultLabel,
  className,
}: MatchCardProps) {
  const pill = PILL[status];

  return (
    <div
      role="listitem"
      aria-label={supplier}
      className={cn(
        "[font-synthesis:none] flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) border border-solid [border-color:var(--border-subtle)] antialiased",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
          {supplier}
        </div>
        <div className={cn("flex items-center h-[20px] px-[6px] rounded-sm", pill.box)}>
          <div
            className={cn(
              "font-ui font-(--weight-medium) text-[10px] uppercase [letter-spacing:var(--tracking-caps)] leading-[12px]",
              pill.text,
            )}
          >
            {pill.label}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[2px]">
        {details.map((line, i) => (
          <div
            key={i}
            className="font-ui whitespace-pre-wrap [color:var(--text-secondary)] text-sm/sm"
          >
            {line}
          </div>
        ))}
      </div>

      {status === "awaiting" ? (
        <Button
          variant="primary"
          onClick={onAction}
          loading={submitting}
          className="w-full"
        >
          {actionLabel}
        </Button>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center h-[36px] rounded-sm shrink-0",
            status === "matched" ? "bg-success-bg" : "bg-warning-bg",
          )}
        >
          <span
            className={cn(
              "font-ui font-(--weight-semibold) whitespace-pre-wrap text-sm/sm",
              status === "matched" ? "text-success" : "text-warning",
            )}
          >
            {resultLabel}
          </span>
        </div>
      )}
    </div>
  );
}
