import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api/require-role";
import { ok, fail } from "@/lib/api/response";
import {
  createAssetSchema,
  listAssetsQuerySchema,
} from "@/lib/validation/assets";
import {
  DomainError,
  createAsset,
  listAssets,
  type CreateAssetInput,
} from "@/lib/domain/assets";

export async function GET(req: NextRequest) {
  const auth = await requireApiRole("admin");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const parsed = listAssetsQuerySchema.safeParse({
    search: sp.get("search") ?? undefined,
    locationId: sp.get("locationId") ?? undefined,
    condition: sp.get("condition") ?? undefined,
    includeDeleted: sp.get("includeDeleted") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const assets = await listAssets(parsed.data, { role: auth.user.role });
    return ok(assets);
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

  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", issue.message, issue.path.join("."));
  }

  try {
    const asset = await createAsset(parsed.data as CreateAssetInput);
    return ok(asset, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.code, e.message, e.field);
    throw e;
  }
}
