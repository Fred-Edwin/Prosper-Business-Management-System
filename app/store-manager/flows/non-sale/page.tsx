// Store Manager — Log Non-Sale flow (staff meals & spoilage). Session 12:
// composed from the kit + wired to POST /api/stock-movements
// { movementType: "non_sale_consumption" }. ADR-44 — artboard 92M-0 (right
// panel) superseded.
import { TransferNonSaleFlow } from "../transfer-nonsale-flow";

export default function NonSaleFlowPage() {
  return <TransferNonSaleFlow mode="non-sale" />;
}
