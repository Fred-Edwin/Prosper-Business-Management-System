import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { listAuditLogQuerySchema } from "@/lib/validation/audit";
import { DomainError, listAuditLog } from "@/lib/domain/audit";

/**
 * `GET /api/audit` (M5 S11 / ADR-25 read side). Admin-only. Paginated
 * (OFFSET/limit), newest first. Filter by `from`/`to` (business-date
 * range on `occurredAt`), `actorId`, `action`, `entityType`, and
 * `group=significant` (the investigable subset the screen defaults to).
 *
 * Returns `{ entries, page: { total, offset, limit, hasMore } }`. Each
 * entry carries the actor's NAME and a best-effort `entityLabel`
 * (`null` → the screen renders `entityType #id`). `oldValue`/`newValue`
 * are the raw `Json` columns — shape varies by action (see `docs/API.md`).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listAuditLogQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    actorId: sp.get("actorId") ?? undefined,
    action: sp.get("action") ?? undefined,
    entityType: sp.get("entityType") ?? undefined,
    group: sp.get("group") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await listAuditLog(parsed.data));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
