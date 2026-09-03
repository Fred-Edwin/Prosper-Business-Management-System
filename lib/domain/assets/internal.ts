import { Prisma } from "@prisma/client";
import type { AssetCondition, AssetView, CreateAssetInput } from "./types";
import { ASSET_CONDITIONS } from "./types";
import { DomainError } from "./errors";

/**
 * The Prisma include used by every read that returns an `AssetView` — one
 * place so list/create/update stay identical.
 */
export const assetInclude = {
  location: true,
} satisfies Prisma.AssetInclude;

type AssetRow = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;

/** Prisma `Decimal` → decimal string, always 2dp (`"45000.00"`). */
function money(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

/** `Date` (a `@db.Date`) → `YYYY-MM-DD`, read in UTC (date-only column). */
function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Map a Prisma asset row (with `location`) to the wire shape. */
export function toAssetView(row: AssetRow): AssetView {
  return {
    id: row.id,
    name: row.name,
    locationId: row.locationId,
    locationName: row.location.name,
    locationType: row.location.type,
    purchaseDate: isoDate(row.purchaseDate),
    purchaseCost: money(row.purchaseCost),
    // `Asset.conditionStatus` is a free-text `String` column, so the DB will
    // accept anything. Validate at this boundary rather than blind-casting —
    // an unrecognised value must never reach the UI (it crashed ConditionChip).
    condition: assertCondition(row.conditionStatus),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function assertCondition(value: string): AssetCondition {
  if (!(ASSET_CONDITIONS as readonly string[]).includes(value)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Condition must be one of: ${ASSET_CONDITIONS.join(", ")}.`,
      "condition",
    );
  }
  return value as AssetCondition;
}

/**
 * Validate + normalise the fields common to create and update. Returns the
 * trimmed name, the `purchaseDate` as a UTC-midnight `Date`, the
 * `purchaseCost` as a `Prisma.Decimal`, and the checked condition.
 *
 * - name trimmed + non-empty
 * - `purchaseCost` a `>= 0` number (money — never a float; ADR-30)
 * - `purchaseDate` a real `YYYY-MM-DD` not in the future (an asset can't be
 *   acquired tomorrow). The mirror of the drawer's `<DatePicker maxDate={now}>`.
 */
export function normaliseAssetCore(input: CreateAssetInput): {
  name: string;
  purchaseDate: Date;
  purchaseCost: Prisma.Decimal;
  condition: AssetCondition;
} {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Asset name is required.", "name");
  }

  const condition = assertCondition(input.condition);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Purchase date must be a YYYY-MM-DD date.",
      "purchaseDate",
    );
  }
  const purchaseDate = new Date(`${input.purchaseDate}T00:00:00.000Z`);
  if (Number.isNaN(purchaseDate.getTime())) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Purchase date is not a valid date.",
      "purchaseDate",
    );
  }
  // "Future" = after the end of today's UTC day — a same-day purchase is fine.
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);
  if (purchaseDate.getTime() > endOfToday.getTime()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Purchase date cannot be in the future.",
      "purchaseDate",
    );
  }

  if (input.purchaseCost == null || input.purchaseCost === "") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Purchase cost is required.",
      "purchaseCost",
    );
  }
  let purchaseCost: Prisma.Decimal;
  try {
    purchaseCost = new Prisma.Decimal(input.purchaseCost);
  } catch {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Purchase cost must be a number.",
      "purchaseCost",
    );
  }
  if (purchaseCost.isNegative()) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Purchase cost cannot be negative.",
      "purchaseCost",
    );
  }

  return { name, purchaseDate, purchaseCost, condition };
}
