// `/admin/audit-trail` — the Audit trail screen (M5 S15). Mounts inside
// app/admin/layout.tsx's <AdminShell>. The read backend + batch grouping
// is `GET /api/audit` (ADR-25 read side / ADR-65 grouping). The
// interactive container is ./audit-trail-client.tsx.
//
// The Dashboard's "Correction today →" link lands here with
// `?action=correct&from=<today>&to=<today>` — parsed below and handed to
// the client as its initial filter.

import type { Metadata } from "next";
import type { AuditAction } from "@prisma/client";
import { AuditTrailClient } from "./audit-trail-client";

export const metadata: Metadata = {
  title: "Audit trail — Prosper Admin",
  description:
    "Who did what: actor, action, what was touched, when, and what changed. Admin-only, paginated.",
};

const ACTIONS: readonly string[] = [
  "create",
  "correct",
  "soft_delete",
  "hard_delete",
  "login",
  "day_close",
  "day_reopen",
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminAuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const action =
    sp.action && ACTIONS.includes(sp.action)
      ? (sp.action as AuditAction)
      : undefined;
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : undefined;
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : undefined;

  return (
    <AuditTrailClient
      initial={{
        action,
        // Only honour a range when both ends are given.
        ...(from && to ? { from, to } : {}),
      }}
    />
  );
}
