// Store Manager — Receive Goods flow (log a supplier delivery). M2-3c
// (ADR-44 body reversal → Option A): the multi-row <SelectableProductRow>
// picker + "Deliveries awaiting receipt" <MatchCard> list, wired to POST
// /api/stock-movements/receipts/batch. The "match a delivery the Admin
// already paid for" path is live — GET /api/stock-movements/outstanding
// was widened to store_manager in 3-DOMAIN.
import { ReceiveFlow } from "./receive-flow";

export default function ReceiveFlowPage() {
  return <ReceiveFlow />;
}
