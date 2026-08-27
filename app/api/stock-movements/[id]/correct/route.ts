import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { ok, fail } from "@/lib/api/response";
import { correctMovementSchema } from "@/lib/validation/stock";
import { DomainError, correctMovement } from "@/lib/domain/stock";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/stock-movements/:id/correct
 *
 * Body: `{ correctedQuantity, note? }`. Auth is any signed-in user; the
 * *domain* decides who may actually correct (Admin always; original
 * recorder only while the day is open) — see `correctMovement`.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.active) {
    return fail("UNAUTHENTICATED", "Sign in to continue.");
  }
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = correctMovementSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const r = await correctMovement(
      {
        movementId: id,
        correctedQuantity: parsed.data.correctedQuantity,
        note: parsed.data.note ?? null,
        recordedById: session.user.id,
      },
      { userId: session.user.id, role: session.user.role, locationId: null },
    );
    return ok(r, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
