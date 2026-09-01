import type { Metadata } from "next";
import { ReceiveTransferFlow } from "./receive-transfer-flow";

// Canteen — Receive Transfer (phase 2 of the 2-phase transfer, ADR-39).
// Reached from the "N items incoming — Review & Receive" banner on the
// Canteen hub. Lists every pending inbound dispatch line with an
// adjustable quantity pre-filled to what was sent; one Receive submit.

export const metadata: Metadata = {
  title: "Receive Transfer — Prosper Canteen",
  description: "Confirm the quantities of an incoming stock transfer.",
};

export default function CanteenReceiveTransferPage() {
  return <ReceiveTransferFlow />;
}
