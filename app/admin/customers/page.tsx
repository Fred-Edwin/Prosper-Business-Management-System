// A1 — Customers & Credit register. Mounts inside app/admin/layout.tsx's
// <AdminShell>; renders the composed content region only.
// Visual acceptance target: `A1 Customers Register — … [M2-01]` (Paper).
import { CustomersClient } from "./customers-client";

export default function AdminCustomersPage() {
  return <CustomersClient />;
}
