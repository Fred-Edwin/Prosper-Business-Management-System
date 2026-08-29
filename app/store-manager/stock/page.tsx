// Store Manager — Stock Levels (mobile). Session 12: composed from the kit
// + wired to GET /api/stock-movements/balances (ADR-40). ADR-44 — artboard
// 986-0 superseded.
import { StockLevelsView } from "./stock-levels-view";

export default function StoreManagerStockPage() {
  return <StockLevelsView locationLabel="Store" locationType="store" />;
}
