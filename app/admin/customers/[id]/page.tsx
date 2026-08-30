// A2 — Customer detail. Mounts inside app/admin/layout.tsx's <AdminShell>.
// Visual acceptance target: `A2 Customer Detail — … [M2-01]` (Paper).
import { CustomerDetailClient } from "./customer-detail-client";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerDetailClient customerId={id} />;
}
