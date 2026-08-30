// C4 — Order detail / edit. Staff shell from `app/cashier/layout.tsx`.
// Editable while the order's Africa/Nairobi business day is today AND it's
// this Cashier's own (PATCH); otherwise read-only + routes to the Admin
// correction path (no form — flow doc walkthrough F). Visual targets:
// `CWU-0` (day open) / `CZF-0` (day closed) / `D18-0` (corrected) — Paper.
import { requireRole } from "@/lib/auth/session";
import { toBusinessDate } from "@/lib/time";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("cashier");
  // The edit gate is `own && same business day` (plan §3.4); the server
  // resolves both facts so the client doesn't need a session hook.
  return (
    <OrderDetailClient
      orderId={id}
      currentUserId={session.user.id}
      todayBusinessDate={toBusinessDate(new Date())}
    />
  );
}
