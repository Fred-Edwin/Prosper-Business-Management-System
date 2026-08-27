// Design-export fixture for the "Store Manager Mobile Hub" screen (Paper artboard 8T3-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview
// visual-regression fixture.
//
// TODO(mock): replace with real data once lib/domain/stock is implemented — the two
// persistent hub banners (pinned transfer / purchase-delivery, milestone-1-plan.md §4.2),
// the Quick Operations tile counts, and today's movement-log rows.

export const hubHeader = {
  title: "Store Hub",
  statusLabel: "Open",
  accountInitials: "JM",
};

/** The two persistent hub banners. `tone` drives the heading/icon colour; the box
 *  is amber (warning) for both on this artboard (see the page.tsx flag note). */
export type HubBanner = {
  tone: "warning" | "info";
  title: string;
  detail: string;
  primaryLabel: string;
  flagLabel: string;
};

export const hubBanners: HubBanner[] = [
  {
    tone: "warning",
    title: "Incoming Transfer from Canteen",
    detail: "48.0 pcs Soda 300ml · dispatched 10m ago",
    primaryLabel: "Accept Delivery (+48 pcs)",
    flagLabel: "Flag Variance",
  },
  {
    tone: "info",
    title: "Purchase Delivery Pending",
    detail: "100.0 kg Rice Basmati · Nairobi Grains Millers · paid 2h ago",
    primaryLabel: "Match Delivery (+100 kg)",
    flagLabel: "Flag Variance",
  },
];

export const hubQuickOpsHeading = "Quick Store Operations";

/** A Quick Operations tile. `tone` picks the icon + sub-label colour;
 *  `iconKey` selects the inline SVG in page.tsx. */
export type HubQuickOpTile = {
  iconKey: "receive" | "issue" | "production" | "transfer";
  title: string;
  subLabel: string;
  tone: "accent" | "danger" | "success" | "info";
};

export const hubQuickOps: HubQuickOpTile[] = [
  { iconKey: "receive", title: "Receive Goods", subLabel: "1 Delivery Pending", tone: "accent" },
  { iconKey: "issue", title: "Issue to Kitchen", subLabel: "Raw ingredients", tone: "danger" },
  { iconKey: "production", title: "Record Production", subLabel: "Cooked batches", tone: "success" },
  { iconKey: "transfer", title: "Transfer to Canteen", subLabel: "Goods & sodas", tone: "info" },
];

export const hubMovementLogHeading = "Today's Movement Log";

export type HubMovementRow = {
  title: string;
  subtitle: string;
  value: string;
  sign: "positive" | "negative";
};

export const hubMovementLog: HubMovementRow[] = [
  {
    title: "Beef Fillet (Store)",
    subtitle: "Issued to Kitchen · Chef Mike",
    value: "-18.5 kg",
    sign: "negative",
  },
  {
    title: "Grilled Chicken (Batch #4)",
    subtitle: "Cooked & prepped for Restaurant",
    value: "+40.0 pcs",
    sign: "positive",
  },
];
