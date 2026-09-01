// Canteen — Transfer Dispatch flow (Canteen → Store/Restaurant, phase 1).
// M2-3d (ADR-44 body reversal → Option A): the multi-row
// <SelectableProductRow> picker + category Tabs + a Destination Select,
// wired to POST /api/stock-movements/transfers/batch. Shares
// <MovementPickerFlow> with the SM flows — see ./transfer-dispatch-flow.tsx.
import { TransferDispatchFlow } from "./transfer-dispatch-flow";

export default function CanteenTransferPage() {
  return <TransferDispatchFlow />;
}
