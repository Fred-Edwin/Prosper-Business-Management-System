import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ActorContext, AssetView, ListAssetsFilter } from "./types";
import { assertCondition, assetInclude, toAssetView } from "./internal";

/**
 * List assets from the register.
 *
 * - `search` (case-insensitive `name` contains) / `locationId` / `condition`
 *   filter the set; soft-deleted rows are excluded unless `includeDeleted`.
 * - Role-scoped: M1 Assets is **Admin-only** (ADR-22), so the route already
 *   gates on `requireApiRole("admin")`. `actor` is threaded through for the
 *   day a location-bound role gets an asset view — at which point this is
 *   where the location scope goes.
 * - Deterministic order: name.
 */
export async function listAssets(
  filter: ListAssetsFilter,
  _actor: ActorContext,
): Promise<AssetView[]> {
  const where: Prisma.AssetWhereInput = {};

  if (!filter.includeDeleted) {
    where.deletedAt = null;
  }
  if (filter.locationId) {
    where.locationId = filter.locationId;
  }
  if (filter.condition) {
    where.conditionStatus = assertCondition(filter.condition);
  }
  if (filter.search && filter.search.trim() !== "") {
    where.name = { contains: filter.search.trim(), mode: "insensitive" };
  }

  const rows = await prisma.asset.findMany({
    where,
    include: assetInclude,
    orderBy: [{ name: "asc" }],
  });

  return rows.map(toAssetView);
}
