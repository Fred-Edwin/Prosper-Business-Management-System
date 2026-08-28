// Store Manager — Receive Goods flow (log a supplier delivery). Session 12:
// composed from the kit + wired to POST /api/stock-movements
// { movementType: "purchase_receipt" }. ADR-44 — the hub's "Receive Goods"
// tile from artboard 8T3-0 is superseded.
//
// The 1-tap "match a pending payment" path (linking purchasePaymentId) is
// TODO(mock) in ./receive-flow.tsx — GET /api/stock-movements/outstanding
// is Admin-only, so there is no staff-facing list of payments awaiting a
// receipt yet. The manual receipt (no link) works fully.
import { ReceiveFlow } from "./receive-flow";

export default function ReceiveFlowPage() {
  return <ReceiveFlow />;
}
