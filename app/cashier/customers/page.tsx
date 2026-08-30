// C6 — Customers list + balances (Cashier mobile). Mounts inside
// app/cashier/layout.tsx's <StaffShell>.
// Visual acceptance target: `C6 Customers Mobile — … [M2-01]` (Paper).
import { CashierCustomersClient } from "./customers-client";

export default function CashierCustomersPage() {
  return <CashierCustomersClient />;
}
