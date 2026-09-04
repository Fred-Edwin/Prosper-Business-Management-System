// Cashier — Log Non-Sale flow (staff meals & spoilage at the Restaurant).
// Session 16: PRD §3 records non-sale consumption as "recorded by: any
// staff" and ADR-67 lists `non_sale_consumption` as a legal outbound at
// the Restaurant, but the only screens were the Store Manager's and (this
// session) the Canteen's. This is the Cashier-side flow — the same
// multi-row <SelectableProductRow> picker + reason <Select> + note
// <Textarea>, wired to POST /api/stock-movements/non-sale/batch with
// `locationId` = the Restaurant. Thin `mode` wrapper over the shared
// <MovementPickerFlow>; all per-flow copy / scoping lives in
// ../../../store-manager/flows/movement-picker-flow.tsx FLOW_CONFIG
// (`restaurant-non-sale`).
import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

export default function CashierNonSaleFlowPage() {
  return <MovementPickerFlow mode="restaurant-non-sale" />;
}
