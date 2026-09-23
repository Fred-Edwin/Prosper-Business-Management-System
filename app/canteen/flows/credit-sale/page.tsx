import type { Metadata } from "next";
import { CreditSaleClient } from "./credit-sale-client";

export const metadata: Metadata = {
  title: "Credit Sale — Prosper Canteen",
  description: "Sell a canteen product to a customer on credit.",
};

export default function CreditSalePage() {
  return <CreditSaleClient />;
}
