import { prisma } from "@/lib/db";
import type {
  AssetView,
  TransitionConditionInput,
  UpdateAssetInput,
} from "./types";
import {
  assertCondition,
  assetInclude,
  normaliseAssetCore,
  toAssetView,
} from "./internal";
import { DomainError } from "./errors";

/**
 * Edit an asset in place — the register is **mutable** (ADR-22), so this is
 * a true update, not a correction row. Assets is not a ledger (contrast F2
 * stock / ADR-15).
 *
 * - Same name/cost/date/condition validation as create.
 * - `locationId` must resolve to a real `Location`.
 * - `NOT_FOUND` if the asset is missing or soft-deleted.
 */
export async function updateAsset(
  id: string,
  input: UpdateAssetInput,
): Promise<AssetView> {
  const core = normaliseAssetCore(input);

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new DomainError("NOT_FOUND", "Asset not found.");
  }

  const location = await prisma.location.findUnique({
    where: { id: input.locationId },
  });
  if (!location) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "The selected location does not exist.",
      "locationId",
    );
  }

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      name: core.name,
      locationId: input.locationId,
      purchaseDate: core.purchaseDate,
      purchaseCost: core.purchaseCost,
      conditionStatus: core.condition,
    },
    include: assetInclude,
  });

  return toAssetView(updated);
}

/**
 * Move an asset between condition states (`Good` → `Needs Repair` →
 * `Decommissioned`, and back). In M1 this is a plain field update with no
 * approval workflow (ADR-22) — it goes through the domain (rather than the
 * route poking `conditionStatus` directly) so a later audit-log hook has a
 * single seam to attach to.
 *
 * `NOT_FOUND` if the asset is missing or soft-deleted.
 */
export async function transitionCondition(
  id: string,
  input: TransitionConditionInput,
): Promise<AssetView> {
  const condition = assertCondition(input.condition);

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new DomainError("NOT_FOUND", "Asset not found.");
  }

  const updated = await prisma.asset.update({
    where: { id },
    data: { conditionStatus: condition },
    include: assetInclude,
  });

  return toAssetView(updated);
}
