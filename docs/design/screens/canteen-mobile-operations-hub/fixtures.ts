// Design-export fixture for the "Canteen Mobile Operations Hub" screen (Paper artboard
// 9BA-0). Values transcribed verbatim from the artboard. Stays as the /design-preview
// visual-regression fixture.
//
// TODO(mock): replace with real data once lib/domain/stock is implemented — the persistent
// incoming-transfer banner, the workflow row states, and today's canteen-log rows.

export const canteenHubHeader = {
  title: "Canteen Operations",
  locationLabel: "Canteen",
  accountInitials: "SA",
};

export const canteenHubBanner = {
  title: "Incoming Stock from Store",
  detail: "Soda 300ml · 48 pcs · dispatched by John M. · 11:30 Today",
  primaryLabel: "Accept Transfer (48 pcs)",
  flagLabel: "Flag Variance",
};

export const canteenWorkflowsHeading = "Canteen Workflows";

/** A workflow row. `iconKey` selects the inline SVG in page.tsx; `active` = the
 *  accent-tinted first row. */
export type CanteenWorkflowRow = {
  iconKey: "stockCount" | "transfer";
  title: string;
  subLabel?: string;
  active: boolean;
};

export const canteenWorkflows: CanteenWorkflowRow[] = [
  {
    iconKey: "stockCount",
    title: "Perform Stock Count",
    subLabel: "Calculates derived sales and closing inventory",
    active: true,
  },
  {
    iconKey: "transfer",
    title: "Transfer Stock to Store/Restaurant",
    active: false,
  },
];

export const canteenLogHeading = "Today's Canteen Log";

export type CanteenLogRow = {
  text: string;
  time: string;
};

export const canteenLog: CanteenLogRow[] = [
  { text: "Accepted 48 pcs Soda 300ml from Store", time: "11:32" },
  { text: "Opening Stock Confirmed (144 pcs Soda, 96 Water)", time: "08:30" },
];
