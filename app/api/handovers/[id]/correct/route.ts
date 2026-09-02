import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import { correctHandoverSchema } from "@/lib/validation/handovers";
import {
  DomainError,
  correctHandover,
  correctReceipt,
} from "@/lib/domain/handovers";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/handovers/:id/correct` — Admin-only, append-only correction
 * (ADR-15 / CONVENTIONS §4). NOT day-close gated — a correction must work
 * on a sealed day.
 *
 * `target: "handover"` corrects the declared figures (writes a delta
 * `Handover` row via `correctsHandoverId`); `target: "receipt"` corrects
 * a recorded receipt (writes a fresh `ReceiptOfHandover` row with the
 * corrected absolute figures + recomputed stored variance — the schema
 * has no `corrects_receipt_id`, ADR-54).
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

  const parsed = correctHandoverSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const actor = { userId: auth.user.id, role: auth.user.role };
    const handover =
      parsed.data.target === "handover"
        ? await correctHandover(
            {
              handoverId: id,
              cashDeclared: parsed.data.cashDeclared,
              mpesaDeclared: parsed.data.mpesaDeclared,
            },
            actor,
          )
        : await correctReceipt(
            {
              receiptId: parsed.data.receiptId,
              cashReceived: parsed.data.cashReceived,
              mpesaReceived: parsed.data.mpesaReceived,
              shortfallNote: parsed.data.shortfallNote,
            },
            actor,
          );
    return ok(handover, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
