import * as React from "react";
import { StatusChip, type StatusChipTone } from "./status-chip";

export type AssetCondition = "good" | "needs_repair" | "decommissioned";

const CONDITION_CONFIG: Record<AssetCondition, { label: string; tone: StatusChipTone }> = {
  good: { label: "Good", tone: "success" },
  needs_repair: { label: "Needs Repair", tone: "warning" },
  decommissioned: { label: "Decommissioned", tone: "danger" },
};

export function ConditionChip({ condition, className }: { condition: AssetCondition; className?: string }) {
  const config = CONDITION_CONFIG[condition];
  return <StatusChip tone={config.tone} label={config.label} className={className} />;
}
