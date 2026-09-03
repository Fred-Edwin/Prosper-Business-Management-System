import type { Location } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

/**
 * List locations, active-only by default. Thin, but keeps the route
 * logic-free — the product drawer renders one per-location price row from
 * this list.
 */
export async function listLocations(
  opts: { activeOnly?: boolean } = {},
): Promise<Location[]> {
  const activeOnly = opts.activeOnly ?? true;
  return prisma.location.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
}

const LOCATION_TYPES = ["restaurant", "canteen", "store"] as const;
type LocationTypeInput = (typeof LOCATION_TYPES)[number];

export type CreateLocationInput = {
  name: string;
  type: LocationTypeInput;
};

export type UpdateLocationInput = {
  name?: string;
  type?: LocationTypeInput;
  active?: boolean;
};

function normaliseName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Location name is required.", "name");
  }
  return trimmed;
}

function assertType(type: string): asserts type is LocationTypeInput {
  if (!LOCATION_TYPES.includes(type as LocationTypeInput)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Type must be restaurant, canteen, or store.",
      "type",
    );
  }
}

/**
 * Create a location (M4). **Admin-only** — enforced at the route.
 *
 * A `Location` is a catalog-like entity, not a ledger, so this is a plain
 * insert. Name is trimmed and must be non-empty; a case-insensitive
 * duplicate of an existing name is rejected (`CONFLICT`) so the picker
 * never shows two "Canteen"s.
 */
export async function createLocation(
  input: CreateLocationInput,
): Promise<Location> {
  const name = normaliseName(input.name);
  assertType(input.type);

  const clash = await prisma.location.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (clash) {
    throw new DomainError(
      "CONFLICT",
      "A location with that name already exists.",
      "name",
    );
  }

  return prisma.location.create({ data: { name, type: input.type } });
}

/**
 * Edit a location in place (M4) — a catalog entry, not a ledger, so a true
 * edit (CONVENTIONS.md §4), not a correction row. **Admin-only.**
 *
 * `active` may be flipped here too, but the safe way to take a location
 * out of service is `deactivateLocation`, which runs the referential
 * guard first. Re-activating (`active: true`) is unguarded — nothing
 * breaks by bringing a location back.
 */
export async function updateLocation(
  id: string,
  input: UpdateLocationInput,
): Promise<Location> {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Location not found.");
  }

  const data: { name?: string; type?: LocationTypeInput; active?: boolean } = {};

  if (input.name !== undefined) {
    const name = normaliseName(input.name);
    const clash = await prisma.location.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: { not: id },
      },
      select: { id: true },
    });
    if (clash) {
      throw new DomainError(
        "CONFLICT",
        "A location with that name already exists.",
        "name",
      );
    }
    data.name = name;
  }

  if (input.type !== undefined) {
    assertType(input.type);
    data.type = input.type;
  }

  if (input.active !== undefined) {
    data.active = input.active;
  }

  return prisma.location.update({ where: { id }, data });
}

/** What `deactivateLocation` found still attached to a location. */
export type LocationDeactivationBlockers = {
  activeStaff: number;
  productsOnSale: number;
  stockOnHand: number;
  pendingTransfersIn: number;
  pendingTransfersOut: number;
};

/**
 * Soft-deactivate a location (M4) — set `active: false`. `Location` has no
 * `deletedAt`; deactivation is the archive.
 *
 * Referential guard, following `catalog/delete-product.ts` (409 on
 * conflict). A location that is still load-bearing is **blocked** — the
 * caller must resolve the conflict first:
 *
 *   - **active staff assigned** — `Staff.locationId` is REQUIRED and drives
 *     role-scoping (a cashier only sees their location's orders). Orphaning
 *     staff here would silently break their whole session, so this blocks.
 *   - **stock on hand** — a non-zero derived balance for any product at
 *     this location. Deactivating would strand inventory that no screen
 *     lists any more. Blocks.
 *   - **pending transfers** — an in-transit `transfer` row (dispatched, not
 *     yet accepted) with this location on either end. Accepting or
 *     correcting it afterwards would be impossible from the UI. Blocks.
 *
 * Products merely *priced* at the location do **not** block — a
 * `ProductLocation` row is harmless once the location is inactive and the
 * Admin can re-point prices later; it is returned in the blocker report as
 * information only (`productsOnSale`), never as a hard stop.
 *
 * On any hard blocker: `CONFLICT`, nothing written. Clean ⇒ `active: false`.
 * Idempotent — deactivating an already-inactive location is a no-op success.
 */
export async function deactivateLocation(id: string): Promise<Location> {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", "Location not found.");
  }
  if (!existing.active) {
    return existing;
  }

  const [activeStaff, productsOnSale, pendingTransfers, balances] =
    await Promise.all([
      prisma.staff.count({ where: { locationId: id, active: true } }),
      prisma.productLocation.count({ where: { locationId: id, active: true } }),
      prisma.stockMovement.findMany({
        where: {
          movementType: "transfer",
          correctsMovementId: null,
          OR: [{ locationId: id }, { transferCounterpartLocationId: id }],
        },
        select: { locationId: true },
      }),
      prisma.stockMovement.groupBy({
        by: ["productId"],
        where: { locationId: id },
        _sum: { quantity: true },
      }),
    ]);

  // A pending dispatch is a `-q` transfer row with no `+q` sibling. The
  // `findMany` above catches both a `-q` row AT this location (a transfer
  // this location sent) and a `-q` row whose COUNTERPART is this location
  // (a transfer inbound to this location, not yet accepted).
  const pendingTransfersOut = pendingTransfers.filter(
    (t) => t.locationId === id,
  ).length;
  const pendingTransfersIn = pendingTransfers.length - pendingTransfersOut;

  const stockOnHand = balances.filter(
    (b) => b._sum.quantity != null && !b._sum.quantity.isZero(),
  ).length;

  const blockers: LocationDeactivationBlockers = {
    activeStaff,
    productsOnSale,
    stockOnHand,
    pendingTransfersIn,
    pendingTransfersOut,
  };

  const hardBlocked =
    activeStaff > 0 ||
    stockOnHand > 0 ||
    pendingTransfersIn > 0 ||
    pendingTransfersOut > 0;

  if (hardBlocked) {
    const parts: string[] = [];
    if (activeStaff > 0) parts.push(`${activeStaff} active staff member(s)`);
    if (stockOnHand > 0) parts.push(`stock on hand for ${stockOnHand} product(s)`);
    const pending = pendingTransfersIn + pendingTransfersOut;
    if (pending > 0) parts.push(`${pending} pending transfer(s)`);
    throw new DomainError(
      "CONFLICT",
      `Cannot deactivate this location — it still has ${parts.join(", ")}. ` +
        "Reassign staff, move stock out, and resolve transfers first.",
    );
  }

  void blockers; // shape documented for the screen; not returned on success.
  return prisma.location.update({
    where: { id },
    data: { active: false },
  });
}
