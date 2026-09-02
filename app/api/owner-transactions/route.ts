import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  listOwnerTransactionsQuerySchema,
  recordOwnerTransactionSchema,
} from "@/lib/validation/financials";
import {
  DomainError,
  listOwnerTransactions,
  recordOwnerTransaction,
} from "@/lib/domain/financials";

/**
 * `/api/owner-transactions` (M3-S4, PRD §4.7). Admin-only.
 *
 *   GET  — list owner draws / returns, newest first, optional date range.
 *   POST — record a draw (money out of Cash at hand) or return (money in);
 *          the domain writes the paired MoneyMovement and day-close gates.
 *
 * The "owed to business" figure is derived on read from these rows (see
 * `GET /api/financials/summary`) — never stored.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listOwnerTransactionsQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await listOwnerTransactions(parsed.data));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordOwnerTransactionSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const txn = await recordOwnerTransaction(parsed.data, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(txn, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
