import type { Metadata } from "next";
import { StockCountClient } from "./stock-count-client";

export const metadata: Metadata = {
  title: "Stock Count — Prosper Canteen",
  description: "Record a canteen stock count to derive sales and closing stock.",
};

export default function StockCountPage() {
  return <StockCountClient />;
}
