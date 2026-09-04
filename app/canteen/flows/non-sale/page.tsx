// Canteen — Log Non-Sale flow (staff meals & spoilage at the Canteen).
// Session 16: PRD §3 records non-sale consumption as "any staff", and
// ADR-67 lists `non_sale_consumption` as a legal outbound at the Canteen,
// but the only screen was the Store Manager's. This is the Canteen-side
// equivalent — the same multi-row <SelectableProductRow> picker + reason
// <Select> + note <Textarea>, wired to POST /api/stock-movements/non-sale/batch
// with `locationId` = the Canteen. Thin `mode` wrapper over the shared
// <MovementPickerFlow> — all per-flow copy / scoping lives in
// ../../../store-manager/flows/movement-picker-flow.tsx FLOW_CONFIG
// (`canteen-non-sale`).
import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

export default function CanteenNonSaleFlowPage() {
  return <MovementPickerFlow mode="canteen-non-sale" />;
}
