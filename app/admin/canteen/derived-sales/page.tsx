import type { Metadata } from "next";
import { DerivedSalesClient } from "./derived-sales-client";

export const metadata: Metadata = {
  title: "Canteen Derived Sales — Prosper Admin",
  description: "Per-product sales derived from canteen stock counts.",
};

export default function AdminDerivedSalesPage() {
  return <DerivedSalesClient />;
}
