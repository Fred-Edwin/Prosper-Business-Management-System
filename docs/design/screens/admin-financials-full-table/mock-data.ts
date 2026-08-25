// TODO(mock): replace with real financials/expenses query (lib/domain/financials) once wired.
// Extracted verbatim from Paper artboard "Admin Financials — Full Table" (7ZJ-0).
import type { StatTile } from "@/components/kit/stat-tile-row";

export const financialsDateSubtitle = "(August 24, 2026)";

export const financialsStatTiles: StatTile[] = [
  { key: "liquidity", label: "Total Business Liquidity", value: "KES 99,600.00" },
  { key: "cash", label: "Cash at Hand", value: "KES 14,200.00" },
  { key: "bank", label: "M-Pesa / Bank Till", value: "KES 85,400.00" },
  { key: "outflows", label: "Today's Total Outflows", value: "KES 47,000.00" },
];

export const financialsTabs = [
  { key: "all", label: "All Transactions (8)" },
  { key: "stock-purchases", label: "Stock Purchases (4)" },
  { key: "operating-expenses", label: "Operating Expenses (3)" },
  { key: "owner-draws", label: "Owner Draws (1)" },
] as const;

export type DeliveryStatusTone = "success" | "warning" | "info";

export interface FinancialsTransactionRow {
  id: string;
  date: string;
  vendor: string;
  description: string;
  destination: string;
  paidFrom: string;
  quantity: string;
  amount: string;
  statusLabel: string;
  statusTone: DeliveryStatusTone;
}

export const financialsTransactions: FinancialsTransactionRow[] = [
  {
    id: "farmers-choice",
    date: "Aug 24, 2026",
    vendor: "Farmer's Choice Butchery",
    description: "Beef Fillet (50.0 kg @ 580/kg)",
    destination: "Store",
    paidFrom: "Cash at Hand",
    quantity: "50.0 kg",
    amount: "29,000.00",
    statusLabel: "Received (50kg)",
    statusTone: "success",
  },
  {
    id: "nairobi-grains",
    date: "Aug 24, 2026",
    vendor: "Nairobi Grains Millers",
    description: "Rice Basmati (100.0 kg @ 180/kg)",
    destination: "Store",
    paidFrom: "M-Pesa / Bank Till",
    quantity: "100.0 kg",
    amount: "18,000.00",
    statusLabel: "Pending Delivery",
    statusTone: "warning",
  },
  {
    id: "afrigas",
    date: "Aug 24, 2026",
    vendor: "Afrigas Energy Ltd",
    description: "Commercial Cooking Gas 50kg Refill",
    destination: "Kitchen",
    paidFrom: "Cash at Hand",
    quantity: "1 tank",
    amount: "7,500.00",
    statusLabel: "Paid (Direct Exp.)",
    statusTone: "info",
  },
];

export const financialsReconciledFooter = {
  title: "Total Reconciled Outflows",
  cashPayments: "KES 36,500.00",
  bankMpesa: "KES 18,000.00",
  totalOutflow: "KES 54,500.00",
};

export const financialsReconciliation = {
  title: "Reconciliation",
  description: "Payments awaiting delivery, and deliveries without a matching payment",
  items: [
    {
      id: "nairobi-grains-match",
      title: "Nairobi Grains Millers",
      badgeLabel: "Payment made, no receipt",
      fields: [
        { label: "Description", value: "Rice Basmati (100.0 kg) · paid, awaiting receipt" },
        { label: "Amount", value: "KES 18,000.00" },
      ],
      actionLabel: "Match",
    },
  ],
};
