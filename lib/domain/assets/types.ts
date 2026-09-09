import type { Location, Role } from "@prisma/client";

export type { Location } from "@prisma/client";

/**
 * Assets domain shapes. Shared by the domain functions, the Zod schemas in
 * `lib/validation/assets.ts`, and the frontend hook (`app/admin/assets/use-assets.ts`).
 *
 * Money crosses this boundary as a `string` (a decimal literal like
 * `"45000.00"`) so it survives JSON without ever becoming a float — the
 * domain converts to/from Prisma `Decimal` internally (CONVENTIONS.md §5,
 * ADR-30). Dates cross as `YYYY-MM-DD` (a calendar date — `Asset.purchaseDate`
 * is a `@db.Date`, no time component).
 *
 * The `Asset` register is **mutable** (ADR-22): `updateAsset` is a true
 * in-place edit, not a correction row. Assets is not a ledger — contrast
 * F2 stock, which is append-only (ADR-15 / ADR-39).
 */

export const ASSET_CONDITIONS = [
  "Good",
  "Needs Repair",
  "Decommissioned",
] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export type CreateAssetInput = {
  name: string;
  locationId: string;
  /** YYYY-MM-DD calendar date; must not be in the future. */
  purchaseDate: string;
  /** Money, decimal string (e.g. "45000.00"). */
  purchaseCost: string;
  condition: AssetCondition;
  /** Whole units this register line stands for; >= 1. Defaults to 1 when omitted. */
  quantity?: number;
  /** Free-text Admin grouping. Trimmed; blank / omitted → `null`. */
  category?: string | null;
};

export type UpdateAssetInput = CreateAssetInput;

/** A plain condition move (ADR-22 — no approval workflow in M1). */
export type TransitionConditionInput = {
  condition: AssetCondition;
};

export type AssetView = {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  locationType: Location["type"];
  /** YYYY-MM-DD. */
  purchaseDate: string;
  /** Decimal string, always 2dp. */
  purchaseCost: string;
  condition: AssetCondition;
  /** Whole units this register line stands for; >= 1. */
  quantity: number;
  /** Free-text Admin grouping, or `null`. */
  category: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAssetsFilter = {
  /** Case-insensitive `name` contains. */
  search?: string;
  locationId?: string;
  condition?: AssetCondition;
  /** Exact category match. `"__uncategorised__"` selects rows with no category. */
  category?: string;
  /** Include soft-deleted rows (default: hidden). */
  includeDeleted?: boolean;
};

/** Filter sentinel: `listAssets({ category: UNCATEGORISED })` → rows with `category = null`. */
export const UNCATEGORISED = "__uncategorised__";

export type ActorContext = {
  role: Role;
};
