// TODO(mock): replace with real store-manager hub query (lib/domain/stock, lib/domain/handovers) once wired.
// Extracted verbatim from Paper artboard "Store Manager Mobile Hub" (8T3-0).

export const storeHubTransferBanner = {
  title: "Incoming Transfer from Canteen",
  detail: "48.0 pcs Soda 300ml · dispatched 10m ago",
  acceptLabel: "Accept Delivery (+48 pcs)",
};

export const storeHubPurchaseBanner = {
  title: "Purchase Delivery Pending",
  detail: "100.0 kg Rice Basmati · Nairobi Grains Millers · paid 2h ago",
  acceptLabel: "Match Delivery (+100 kg)",
};

export const storeHubQuickOpsTitle = "Quick Store Operations";

export const storeHubQuickOps = [
  { key: "receive-goods", label: "Receive Goods", meta: "1 Delivery Pending" },
  { key: "issue-to-kitchen", label: "Issue to Kitchen", meta: "Raw ingredients" },
  { key: "record-production", label: "Record Production", meta: "Cooked batches" },
  { key: "transfer-to-canteen", label: "Transfer to Canteen", meta: "Goods & sodas" },
];

export const storeHubMovementLogTitle = "Today's Movement Log";

export interface MovementLogEntry {
  id: string;
  title: string;
  detail: string;
  delta: string;
  positive: boolean;
}

export const storeHubMovementLog: MovementLogEntry[] = [
  {
    id: "beef-fillet-issue",
    title: "Beef Fillet (Store)",
    detail: "Issued to Kitchen · Chef Mike",
    delta: "-18.5 kg",
    positive: false,
  },
  {
    id: "grilled-chicken-batch-4",
    title: "Grilled Chicken (Batch #4)",
    detail: "Cooked & prepped for Restaurant",
    delta: "+40.0 pcs",
    positive: true,
  },
];
