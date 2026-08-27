// Design-export fixture for the "Admin Assets Register" screen (Paper artboard 8DL-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview visual-regression fixture.
// TODO(mock): replace with real query once lib/domain/assets/listAssets is implemented.

export type AssetCondition = "Good" | "Needs Repair" | "Decommissioned";

export type AssetRow = {
  name: string;
  category: string;
  location: string;
  /** Display string exactly as drawn ("Jan 15, 2025"). */
  purchaseDate: string;
  /** Display string exactly as drawn ("45,000.00"). */
  costBasis: string;
  condition: AssetCondition;
};

export const assetsTitle = "Physical Assets Register";
export const assetsCountLabel = "18 Assets Registered";
export const assetsAddLabel = "Register New Asset";

export const assetsCategoryTabs = [
  "All Categories",
  "Kitchen Equipment",
  "Refrigeration",
  "Electronics & POS",
  "Furniture",
] as const;
export const assetsActiveCategoryTab = "All Categories";
export const assetsLocationFilter = "Location: All";
export const assetsConditionFilter = "Condition: All";

/** Condition dot color, per Paper: Good=success, Needs Repair=warning, Decommissioned=danger. */
export const assetsConditionDotClass: Record<AssetCondition, string> = {
  Good: "bg-success",
  "Needs Repair": "bg-warning",
  Decommissioned: "bg-danger",
};
export const assetsConditionTextClass: Record<AssetCondition, string> = {
  Good: "text-success",
  "Needs Repair": "text-warning",
  Decommissioned: "text-danger",
};

export const assetsRows: AssetRow[] = [
  {
    name: "Commercial Deep Fryer Double",
    category: "Kitchen Equipment",
    location: "Restaurant Kitchen",
    purchaseDate: "Jan 15, 2025",
    costBasis: "45,000.00",
    condition: "Good",
  },
  {
    name: "400L Upright Commercial Chiller",
    category: "Refrigeration",
    location: "Store",
    purchaseDate: "Nov 10, 2024",
    costBasis: "92,000.00",
    condition: "Good",
  },
  {
    name: "Samsung Galaxy Tab A8 POS",
    category: "Electronics & POS",
    location: "Restaurant Cashier",
    purchaseDate: "Aug 12, 2025",
    costBasis: "28,000.00",
    condition: "Needs Repair",
  },
];

export const assetsSummary = {
  label: "Total Active Register (18 Physical Assets)",
  good: "Good: 16",
  needsRepair: "Needs Repair: 1",
  decommissioned: "Decommissioned: 1",
  totalCostBasisLabel: "Total Cost Basis:",
  totalCostBasisValue: "KES 482,500.00",
};

export const assetsAccount = { initials: "EK", name: "Edwin K.", role: "Admin" };
