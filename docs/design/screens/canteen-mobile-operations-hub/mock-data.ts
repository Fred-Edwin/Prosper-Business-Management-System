// TODO(mock): replace with real canteen operations query (lib/domain/stock, lib/domain/handovers) once wired.
// Extracted verbatim from Paper artboard "Canteen Mobile Operations Hub" (9BA-0).

export const canteenHubTransferBanner = {
  title: "Incoming Stock from Store",
  detail: "Soda 300ml · 48 pcs · dispatched by John M. · 11:30 Today",
  acceptLabel: "Accept Transfer (48 pcs)",
};

export const canteenWorkflowsTitle = "Canteen Workflows";

export const canteenWorkflows = [
  {
    key: "stock-count",
    title: "Perform Stock Count",
    description: "Calculates derived sales and closing inventory",
  },
  {
    key: "transfer-stock",
    title: "Transfer Stock to Store/Restaurant",
    description: "",
  },
];

export const canteenLogTitle = "Today's Canteen Log";

export interface CanteenLogEntry {
  id: string;
  text: string;
  time: string;
}

export const canteenLog: CanteenLogEntry[] = [
  { id: "accepted-transfer", text: "Accepted 48 pcs Soda 300ml from Store", time: "11:32" },
  { id: "opening-stock-confirmed", text: "Opening Stock Confirmed (144 pcs Soda, 96 Water)", time: "08:30" },
];
