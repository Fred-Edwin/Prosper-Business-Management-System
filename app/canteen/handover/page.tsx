// /canteen/handover — the Canteen Attendant's end-of-day cash / M-Pesa
// declaration (M3 S3). Same screen as /cashier/handover, mirrored per the
// session handoff. Mounts inside app/canteen/layout.tsx's <StaffShell>.
import { HandoverClient } from "@/app/cashier/handover/handover-client";

export default function CanteenHandoverPage() {
  return <HandoverClient locationLabel="the Canteen" />;
}
