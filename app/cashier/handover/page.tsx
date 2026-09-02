// /cashier/handover — the Cashier's end-of-day cash / M-Pesa declaration
// (M3 S3). Mounts inside app/cashier/layout.tsx's <StaffShell>.
import { HandoverClient } from "./handover-client";

export default function CashierHandoverPage() {
  return <HandoverClient locationLabel="the Restaurant" />;
}
