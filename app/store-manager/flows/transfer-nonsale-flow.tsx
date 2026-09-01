"use client";

// Store Manager — Transfer Stock / Log Non-Sale flow. M2-3c (ADR-44 body
// reversal → Option A): the multi-row picker is back. Thin wrapper over
// <MovementPickerFlow>.
//
//   mode="transfer"  → Store → {destination} (info), category Tabs, a
//                      Destination <Select>, POST …/transfers/batch
//                      (phase 1 — the −q dispatch rows; the receiver
//                      accepts via the pinned banner on their hub).
//   mode="non-sale"  → Staff meals & spoilage (warning), reason <Select>
//                      + note <Textarea> (required iff reason "other"),
//                      POST …/non-sale/batch.
//
// All per-flow copy / secondary fields / endpoint live in
// movement-picker-flow.tsx FLOW_CONFIG.

import { MovementPickerFlow } from "./movement-picker-flow";

export function TransferNonSaleFlow({
  mode,
}: {
  mode: "transfer" | "non-sale";
}) {
  return <MovementPickerFlow mode={mode} />;
}
