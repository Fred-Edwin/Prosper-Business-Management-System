// Canteen — Receive Goods flow (a supplier delivery destined for the
// Canteen). Session 16 / ADR-69: receiving is by DESTINATION, not by the
// receiver's home location. ADR-67 lands ingredients at the Store and
// goods at the Restaurant, and `/outstanding` was scoped to the caller's
// single assigned location — so a Canteen-destined purchase was a dead
// end: no role could see it and none could receive it. This is the
// Canteen-side receive screen: the same "Deliveries awaiting receipt"
// <MatchCard> list + additive picker the SM flow uses, posting ONE
// receipt batch at the Canteen (no kind split — the Canteen only ever
// holds dish/goods). Goods still ALSO arrive by transfer from the
// Restaurant (ADR-67), unchanged. Thin `mode` wrapper over the shared
// <MovementPickerFlow>; all per-flow copy / scoping lives in
// ../../../store-manager/flows/movement-picker-flow.tsx FLOW_CONFIG
// (`canteen-receive`).
import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

export default function CanteenReceiveFlowPage() {
  return <MovementPickerFlow mode="canteen-receive" />;
}
