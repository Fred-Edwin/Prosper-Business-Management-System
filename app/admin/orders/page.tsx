import type { Metadata } from "next";
import { AdminOrdersClient } from "./admin-orders-client";

export const metadata: Metadata = {
  title: "Orders — Prosper Admin",
  description: "All Restaurant orders across every cashier — view and record corrections.",
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
