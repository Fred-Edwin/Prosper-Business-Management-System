// Canteen — Customers list + repayment. Mounts inside
// app/canteen/layout.tsx's <StaffShell>. Mirrors app/cashier/customers's
// C6 screen — see customers-client.tsx for the ADR-91 follow-up context.
import { CanteenCustomersClient } from "./customers-client";

export default function CanteenCustomersPage() {
  return <CanteenCustomersClient />;
}
