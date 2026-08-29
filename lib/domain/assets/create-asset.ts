import { prisma } from "@/lib/db";
import type { AssetView, CreateAssetInput } from "./types";
import { assetInclude, normaliseAssetCore, toAssetView } from "./internal";
import { DomainError } from "./errors";

/**
 * Register a new asset (ADR-22). A single row — no ledger, no join table.
 *
 * - name / cost / date / condition validated + normalised (see `normaliseAssetCore`).
 * - `locationId` must resolve to a real `Location`.
 */
export async function createAsset(
  input: CreateAssetInput,
): Promise<AssetView> {
  const core = normaliseAssetCore(input);

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

  const created = await prisma.asset.create({
    data: {
      name: core.name,
      locationId: input.locationId,
      purchaseDate: core.purchaseDate,
      purchaseCost: core.purchaseCost,
      conditionStatus: core.condition,
    },
    include: assetInclude,
  });

  return toAssetView(created);
}
