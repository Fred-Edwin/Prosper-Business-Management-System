// Store Manager — Transfer Stock flow (Store → Canteen/Restaurant, phase 1).
// Session 12: composed from the kit + wired to POST /api/stock-movements
// { movementType: "transfer" }. ADR-44 — artboard 92M-0 (left panel) superseded.
import { TransferNonSaleFlow } from "../transfer-nonsale-flow";

export default function TransferFlowPage() {
  return <TransferNonSaleFlow mode="transfer" />;
}
