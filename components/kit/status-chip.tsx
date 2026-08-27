// Verbatim transcription of Paper artboard "Component Kit — Chips & Status" (6DJ-0):
// "Status Chip Row" (6DO-0). Session 2 verified state-complete — semantic variants, not
// interaction states; display-only. Each chip: flex items-center h-[20px] rounded-lg
// gap-[6px], a w-[6px] h-[6px] rounded-[50%] dot, then a font-(--weight-medium)
// text-caption/micro label. Dot + label share the semantic color:
//   success → bg-success / text-success       (drawn label "Matched")
//   warning → bg-warning / text-warning       ("Pending")
//   danger  → bg-danger  / text-danger        ("Short")
//   info    → bg-info     / text-info          ("Awaiting receipt")
//   neutral → [background-color:var(--text-tertiary)] / [color:var(--text-secondary)]  ("Closed")
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusChipVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface StatusChipProps {
  variant: StatusChipVariant;
  children: React.ReactNode;
  className?: string;
}

const DOT: Record<StatusChipVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "[background-color:var(--text-tertiary)]",
};

const LABEL: Record<StatusChipVariant, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "[color:var(--text-secondary)]",
};

export function StatusChip({ variant, children, className }: StatusChipProps) {
  return (
    <div
      className={cn(
        "[font-synthesis:none] flex items-center h-[20px] rounded-lg gap-[6px] antialiased",
        className,
      )}
    >
      <div className={cn("w-[6px] h-[6px] shrink-0 rounded-[50%]", DOT[variant])} />
      <div className={cn("font-ui font-(--weight-medium) text-caption/micro", LABEL[variant])}>
        {children}
      </div>
    </div>
  );
}
