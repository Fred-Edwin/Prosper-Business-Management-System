import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusChipTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatusChipTone, string> = {
  success: "bg-success text-success",
  warning: "bg-warning text-warning",
  danger: "bg-danger text-danger",
  info: "bg-info text-info",
  neutral: "bg-text-tertiary text-text-tertiary",
};

export function StatusChip({ tone, label, className }: { tone: StatusChipTone; label: string; className?: string }) {
  const [dotBg, textColor] = toneClasses[tone].split(" ");
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", dotBg)} />
      <span className={cn("font-ui text-caption/caption font-medium", textColor)}>{label}</span>
    </span>
  );
}
