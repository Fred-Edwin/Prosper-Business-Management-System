import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  transitionConditionSchema,
  updateAssetSchema,
} from "@/lib/validation/assets";
import {
  DomainError,
  transitionCondition,
  updateAsset,
  type UpdateAssetInput,
} from "@/lib/domain/assets";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `PATCH /api/assets/:id`
 *   body `{ condition }` only        → a condition transition (ADR-22)
 *   body with name / cost / date …   → a full in-place edit
 *
 * Assets is a mutable register (ADR-22) — this is a true update, not a
 * correction row (contrast the stock ledger).
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const isTransitionOnly =
    body != null &&
    typeof body === "object" &&
    Object.keys(body as Record<string, unknown>).length === 1 &&
    "condition" in (body as Record<string, unknown>);

  if (isTransitionOnly) {
    const parsed = transitionConditionSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
    }
    try {
      return ok(await transitionCondition(id, parsed.data));
    } catch (e) {
      if (e instanceof DomainError) return fail(e.code, e.message, e.field);
      throw e;
    }
  }

  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    return ok(await updateAsset(id, parsed.data as UpdateAssetInput));
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
