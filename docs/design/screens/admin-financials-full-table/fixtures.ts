// Design-export fixture for the "Admin Financials — Full Table" screen (Paper artboard 7ZJ-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview visual-regression fixture.
// TODO(mock): replace with real query once lib/domain/financials + lib/domain/stock (purchase
// payment / receipt / reconciliation) are implemented.
//
// NOTE (design deviation, owner-approved 2026-08-27, "Option A"): the 4-tile KPI stat strip
// (Total Business Liquidity / Cash at Hand / M-Pesa · Bank Till / Today's Total Outflows) is
// exported here exactly as drawn in Paper. This CONTRADICTS the Session 2 D-FIN decision
// (component-states.md §7 / DECISIONS.md ADR-36 / milestone-1-plan.md §2), which put the KPI
// strip in Milestone 3, not M1. A later design sprint removes it; this fixture + skeleton match
// the current artboard.

export const financialsTitle = "Financials & Expenses";
export const financialsDateLabel = "(August 24, 2026)";
export const financialsRecordPaymentLabel = "Record Payment";
export const financialsAccount = { initials: "EK", name: "Edwin K.", role: "Admin" };

/** KPI stat tiles — verbatim from the artboard. `tone` maps to the value text color. */
export type FinancialsKpiTile = {
  label: string;
  value: string;
  tone: "primary" | "success" | "info" | "danger";
};

export const financialsKpiTiles: FinancialsKpiTile[] = [
  { label: "Total Business Liquidity", value: "KES 99,600.00", tone: "primary" },
  { label: "Cash at Hand", value: "KES 14,200.00", tone: "success" },
  { label: "M-Pesa / Bank Till", value: "KES 85,400.00", tone: "info" },
  { label: "Today's Total Outflows", value: "KES 47,000.00", tone: "danger" },
];

export const financialsKpiToneClass: Record<FinancialsKpiTile["tone"], string> = {
  primary: "[color:var(--text-primary)]",
  success: "text-success",
  info: "text-info",
  danger: "text-danger",
};

export const financialsTabs = [
  "All Transactions (8)",
  "Stock Purchases (4)",
  "Operating Expenses (3)",
  "Owner Draws (1)",
] as const;
export const financialsActiveTab = "Stock Purchases (4)";

/** Delivery-status dot+text — Received/Paid = success, Pending = warning. */
export type FinancialsDeliveryStatus =
  | { label: string; tone: "success" | "warning" };

export type FinancialsTxRow = {
  date: string;
  vendor: string;
  description: string;
  destination: string;
  paidFrom: string;
  quantity: string;
  /** Em-dash-style muted quantity renders tertiary in Paper. */
  quantityMuted?: boolean;
  amount: string;
  status: FinancialsDeliveryStatus;
};

export const financialsTxRows: FinancialsTxRow[] = [
  {
    date: "Aug 24, 2026",
    vendor: "Farmer's Choice Butchery",
    description: "Beef Fillet (50.0 kg @ 580/kg)",
    destination: "Store",
    paidFrom: "Cash at Hand",
    quantity: "50.0 kg",
    amount: "29,000.00",
    status: { label: "Received (50kg)", tone: "success" },
  },
  {
    date: "Aug 24, 2026",
    vendor: "Nairobi Grains Millers",
    description: "Rice Basmati (100.0 kg @ 180/kg)",
    destination: "Store",
    paidFrom: "M-Pesa / Bank Till",
    quantity: "100.0 kg",
    amount: "18,000.00",
    status: { label: "Pending Delivery", tone: "warning" },
  },
  {
    date: "Aug 24, 2026",
    vendor: "Afrigas Energy Ltd",
    description: "Commercial Cooking Gas 50kg Refill",
    destination: "Kitchen",
    paidFrom: "Cash at Hand",
    quantity: "1 tank",
    quantityMuted: true,
    amount: "7,500.00",
    status: { label: "Paid (Direct Exp.)", tone: "success" },
  },
];

export const financialsReconciledFooter = {
  label: "Total Reconciled Outflows",
  cashPaymentsLabel: "Cash Payments:",
  cashPaymentsValue: "KES 36,500.00",
  bankLabel: "Bank / M-Pesa:",
  bankValue: "KES 18,000.00",
  totalLabel: "Total Outflow:",
  totalValue: "KES 54,500.00",
};

export const financialsReconciliation = {
  heading: "Reconciliation",
  subheading:
    "Payments awaiting delivery, and deliveries without a matching payment",
  rows: [
    {
      vendor: "Nairobi Grains Millers",
      description: "Rice Basmati (100.0 kg) · paid, awaiting receipt",
      amount: "18,000.00",
      status: { label: "Payment made, no receipt", tone: "warning" as const },
      action: "Match",
    },
  ],
};
