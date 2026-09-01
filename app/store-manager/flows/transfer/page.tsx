// Store Manager — Transfer Stock flow (Store → Canteen/Restaurant, phase
// 1). M2-3c (ADR-44 body reversal → Option A): the multi-row
// <SelectableProductRow> picker + category Tabs + a Destination Select,
// wired to POST /api/stock-movements/transfers/batch. See
// ../movement-picker-flow.tsx.
import { TransferNonSaleFlow } from "../transfer-nonsale-flow";

export default function TransferFlowPage() {
  return <TransferNonSaleFlow mode="transfer" />;
}
