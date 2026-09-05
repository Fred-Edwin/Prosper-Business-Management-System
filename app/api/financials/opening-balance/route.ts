import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { setOpeningBalanceSchema } from "@/lib/validation/financials";
import {
  DomainError,
  getOpeningBalances,
  setOpeningBalance,
} from "@/lib/domain/financials";

/**
 * `/api/financials/opening-balance` (ADR-70). Admin-only.
 *
 *   GET — the pinned Day-1 business date plus each account's stated
 *         opening position (`set: false` where none was ever recorded).
 *   PUT — state (or restate) ONE account's opening figure. Idempotent by
 *         design: the domain writes the delta needed to reach the stated
 *         position, so re-sending the same figure is a no-op row of zero
 *         rather than a duplicate opening.
 *
 * `PUT` rather than `POST`: the caller names a target state ("cash opens
 * at 40,000"), not an event to append. The ledger row is an implementation
 * detail of reaching that state.
 *
 * There is no date parameter on either verb — the domain pins it (see
 * `resolveOpeningDay`). Account balances themselves stay derived and are
 * read from `GET /api/money/balances`; this route only ever touches the
 * `opening_balance` rows.
 */
export async function GET() {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  try {
    return ok(await getOpeningBalances());
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = setOpeningBalanceSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const view = await setOpeningBalance(parsed.data, {
      actorId: auth.user.id,
      role: auth.user.role,
    });
    return ok(view);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
