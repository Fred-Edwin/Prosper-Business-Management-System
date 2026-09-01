"use client";

// Canteen — Transfer Dispatch flow (Canteen → Store/Restaurant, phase 1).
// M2-3d (ADR-44 body reversal → Option A): rebuilt on the shared
// <MovementPickerFlow> multi-row picker — the same component the five SM
// stock-movement flows compose (M2-3c). This file is now a thin `mode`
// wrapper; all per-flow copy / secondary fields / endpoint / the
// Canteen-as-source scoping live in ../../store-manager/flows/
// movement-picker-flow.tsx FLOW_CONFIG (`dispatch`).
//
//   mode="dispatch" → Canteen → {destination} (info), category Tabs, a
//                     Destination <Select>, availability from the derived
//                     Canteen balance, the §9.8 over-stock block, one
//                     batch POST /api/stock-movements/transfers/batch
//                     { fromLocationId: canteen, toLocationId, lines } →
//                     Toast "Dispatched · awaiting {dest} accept" → back
//                     to /canteen. The receiver accepts via the pinned
//                     banner on their hub (two-phase transfer).
//
// Artboards [M2-3D]: KW0-0 (populated) / KY1-0 (empty) / KZX-0 (loading) /
// L0Y-0 (error) / L2V-0 (over-stock blocked). 9FE-0 is the historical
// reference only.

import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

export function TransferDispatchFlow() {
  return <MovementPickerFlow mode="dispatch" />;
}
