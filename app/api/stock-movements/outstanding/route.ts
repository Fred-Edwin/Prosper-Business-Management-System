import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { DomainError, listOutstandingPurchases } from "@/lib/domain/stock";

/**
 * GET /api/stock-movements/outstanding — Admin only. Purchase payments
 * awaiting a receipt, and receipts with no matching payment (PRD 4.2).
 */
export async function GET() {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  try {
    return ok(await listOutstandingPurchases());
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
