"use client";

// Store Manager — Receive Goods flow (log a supplier delivery). M2-3c
// (ADR-44 body reversal → Option A): the multi-row picker is back. Thin
// wrapper over <MovementPickerFlow mode="receive"> — search + optional
// "Deliveries awaiting receipt" <MatchCard> list + <SelectableProductRow>
// list + batch submit → POST /api/stock-movements/receipts/batch.
//
// The "match a delivery the Admin already paid for" path (linking
// purchasePaymentId) is now live: GET /api/stock-movements/outstanding was
// widened to store_manager in 3-DOMAIN. Tapping "Match this delivery" on a
// card pre-fills a selected row with that delivery's product + quantity
// and links the line on submit.

import { MovementPickerFlow } from "../movement-picker-flow";

export function ReceiveFlow() {
  return <MovementPickerFlow mode="receive" />;
}
