// Canteen — Transfer Dispatch flow (Canteen → Store/Restaurant, phase 1).
// Session 12: composed from the kit + wired to POST /api/stock-movements
// { movementType: "transfer" }. ADR-44 — artboard 9FE-0 superseded.
import { TransferDispatchFlow } from "./transfer-dispatch-flow";

export default function CanteenTransferPage() {
  return <TransferDispatchFlow />;
}
