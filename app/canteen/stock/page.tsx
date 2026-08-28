// Canteen — Stock Levels (mobile). Session 12: composed from the kit +
// wired to GET /api/stock-movements/balances (ADR-40). ADR-44 — artboard
// 9GW-0 superseded. Same view as /store-manager/stock, Canteen-scoped.
import { StockLevelsView } from "@/app/store-manager/stock/stock-levels-view";

export default function CanteenStockPage() {
  return <StockLevelsView locationLabel="Canteen" locationType="canteen" />;
}
