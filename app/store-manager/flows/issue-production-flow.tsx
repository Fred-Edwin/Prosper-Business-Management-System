"use client";

// Store Manager — Issue Ingredients / Record Batch Production flow. M2-3c
// (ADR-44 body reversal → Option A): the multi-row picker is back. Thin
// wrapper over <MovementPickerFlow>.
//
//   mode="issue"       → Store → Kitchen (danger), ingredient/goods rows,
//                        POST /api/stock-movements/issues/batch
//   mode="production"  → Kitchen → Restaurant (success), kind="dish" rows
//                        into the Restaurant, POST …/production/batch
//
// All per-flow copy / secondary fields / endpoint live in
// movement-picker-flow.tsx FLOW_CONFIG.

import { MovementPickerFlow } from "./movement-picker-flow";

export function IssueProductionFlow({
  mode,
}: {
  mode: "issue" | "production";
}) {
  return <MovementPickerFlow mode={mode} />;
}
