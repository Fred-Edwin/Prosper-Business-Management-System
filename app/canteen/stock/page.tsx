// Canteen — Stock Levels (mobile). Session 12: composed from the kit +
// wired to GET /api/stock-movements/balances (ADR-40). ADR-44 — artboard
// 9GW-0 superseded. Same view as /store-manager/stock, Canteen-scoped
// (server-side `locationId` filter) with the Canteen pill set
// (All · Beverages · Goods — no "Dishes"; M2-3d).
import {
  StockLevelsView,
  CANTEEN_STOCK_PILLS,
} from "@/app/store-manager/stock/stock-levels-view";

export default function CanteenStockPage() {
  return (
    <StockLevelsView
      locationLabel="Canteen"
      locationType="canteen"
      pillSet={CANTEEN_STOCK_PILLS}
    />
  );
}
