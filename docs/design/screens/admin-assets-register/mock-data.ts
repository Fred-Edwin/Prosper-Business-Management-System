// TODO(mock): replace with real asset-register query (lib/domain/assets) once wired.
// Extracted verbatim from Paper artboard "Admin Assets Register" (8DL-0).
import type { AssetCondition } from "@/components/kit/condition-chip";

export const assetsCountBadge = "18 Assets Registered";

export const assetsCategoryTabs = [
  { key: "all", label: "All Categories" },
  { key: "kitchen-equipment", label: "Kitchen Equipment" },
  { key: "refrigeration", label: "Refrigeration" },
  { key: "electronics-pos", label: "Electronics & POS" },
  { key: "furniture", label: "Furniture" },
] as const;

export interface AssetRow {
  id: string;
  name: string;
  category: string;
  location: string;
  purchaseDate: string;
  costBasis: string;
  condition: AssetCondition;
}

export const assetRows: AssetRow[] = [
  {
    id: "deep-fryer",
    name: "Commercial Deep Fryer Double",
    category: "Kitchen Equipment",
    location: "Restaurant Kitchen",
    purchaseDate: "Jan 15, 2025",
    costBasis: "45,000.00",
    condition: "good",
  },
  {
    id: "chiller-400l",
    name: "400L Upright Commercial Chiller",
    category: "Refrigeration",
    location: "Store",
    purchaseDate: "Nov 10, 2024",
    costBasis: "92,000.00",
    condition: "good",
  },
  {
    id: "galaxy-tab-pos",
    name: "Samsung Galaxy Tab A8 POS",
    category: "Electronics & POS",
    location: "Restaurant Cashier",
    purchaseDate: "Aug 12, 2025",
    costBasis: "28,000.00",
    condition: "needs_repair",
  },
];

export const assetsRegisterFooter = {
  title: "Total Active Register (18 Physical Assets)",
  good: "Good: 16",
  needsRepair: "Needs Repair: 1",
  decommissioned: "Decommissioned: 1",
  totalCostBasisLabel: "Total Cost Basis:",
  totalCostBasis: "KES 482,500.00",
};
