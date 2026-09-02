import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { recordReceiptSchema } from "@/lib/validation/handovers";
import { DomainError, recordReceipt } from "@/lib/domain/handovers";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/handovers/:id/receive` — Admin records receipt of a
 * handover. Computes and permanently stores the variance (received −
 * declared) per channel; a shortfall requires a note (→
 * `HandoverShortfall`). Day-close gated (create path). No `MoneyMovement`
 * (ADR-54 — custody transfer, not new revenue). Admin-only.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = recordReceiptSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const handover = await recordReceipt(
      {
        handoverId: id,
        cashReceived: parsed.data.cashReceived,
        mpesaReceived: parsed.data.mpesaReceived,
        shortfallNote: parsed.data.shortfallNote,
        occurredAt: parsed.data.occurredAt
          ? new Date(parsed.data.occurredAt)
          : undefined,
      },
      { userId: auth.user.id, role: auth.user.role },
    );
    return ok(handover, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
