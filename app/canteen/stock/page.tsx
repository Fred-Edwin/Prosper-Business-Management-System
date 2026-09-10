// Canteen — Stock Levels (mobile). Session 12: composed from the kit +
// wired to GET /api/stock-movements/balances (ADR-40). ADR-44 — artboard
// 9GW-0 superseded. Same view as /store-manager/stock, Canteen-scoped
// (server-side `locationId` filter). The filter row is built from each
// stocked product's Admin-set `category` (client feedback 2026-09-10),
// superseding the old fixed `All · Beverages · Goods` pill set.
import { StockLevelsView } from "@/app/store-manager/stock/stock-levels-view";

export default function CanteenStockPage() {
  return (
    <StockLevelsView
      locationLabel="Canteen"
      locationType="canteen"
      categoryPills
    />
  );
}
