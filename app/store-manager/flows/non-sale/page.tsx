// Store Manager — Log Non-Sale flow (staff meals & spoilage). M2-3c
// (ADR-44 body reversal → Option A): the multi-row <SelectableProductRow>
// picker + a reason Select + a note Textarea, wired to POST
// /api/stock-movements/non-sale/batch. See ../movement-picker-flow.tsx.
import { TransferNonSaleFlow } from "../transfer-nonsale-flow";

export default function NonSaleFlowPage() {
  return <TransferNonSaleFlow mode="non-sale" />;
}
