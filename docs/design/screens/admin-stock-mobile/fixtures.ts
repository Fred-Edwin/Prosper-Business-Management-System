// Design-export fixture for the "Admin Stock — Mobile" screen (Paper artboard 8Q4-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview
// visual-regression fixture.
//
// TODO(mock): replace with real query once lib/domain/stock (getDerivedStockBalance +
// today's sold value) is implemented.

export const stockMobileHeader = {
  title: "Stock & Movements",
  statusLabel: "Open",
  accountInitials: "EK",
};

export const stockMobileSummary = {
  stockOnHandLabel: "Stock on Hand (Total)",
  stockOnHandValue: "KES 76,800.00",
  soldValueLabel: "Today's Sold Value",
  soldValue: "KES 32,720.00",
};

export const stockMobileLocationTabs = ["All (3)", "Store", "Restaurant", "Canteen"] as const;
export const stockMobileActiveLocationTab = "All (3)";

/** A movement chip on a card. `underlined` marks a corrected movement (ADR-36a). */
export type StockMobileMovement = {
  text: string;
  tone: "success" | "danger";
  underlined?: boolean;
};

export type StockMobileCard = {
  name: string;
  location: string;
  onHand: string;
  onHandValue: string;
  movements: StockMobileMovement[];
  openingLabel: string;
  adjustLabel: string;
};

export const stockMobileCards: StockMobileCard[] = [
  {
    name: "Beef Fillet",
    location: "Store",
    onHand: "46.5 kg",
    onHandValue: "KES 27,900.00",
    movements: [
      { text: "+50.0 Purch", tone: "success" },
      { text: "-18.5 Issue", tone: "danger", underlined: true },
      { text: "-10.0 Tr Out", tone: "danger" },
    ],
    openingLabel: "Open: 25.0 kg",
    adjustLabel: "Adjust",
  },
  {
    name: "Grilled Chicken",
    location: "Restaurant",
    onHand: "15.0 pcs",
    onHandValue: "KES 7,200.00",
    movements: [
      { text: "+40.0 Prod", tone: "success" },
      { text: "+5.0 Tr In", tone: "success" },
      { text: "-38.0 Sold (KES 18,240)", tone: "danger" },
    ],
    openingLabel: "Open: 8.0 pcs",
    adjustLabel: "Adjust",
  },
  {
    name: "Soda 300ml",
    location: "Canteen",
    onHand: "140.0 pcs",
    onHandValue: "KES 7,000.00",
    movements: [
      { text: "+48.0 Tr In", tone: "success" },
      { text: "-52.0 Sold (KES 4,680)", tone: "danger" },
    ],
    openingLabel: "Open: 144.0 pcs",
    adjustLabel: "Adjust",
  },
];

export const stockMobileActions = {
  openingStockLabel: "Opening Stock",
  recordPaymentLabel: "Record Payment",
};
