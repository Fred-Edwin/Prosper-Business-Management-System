import type { LocationType, Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * ADR-69 — receiving is by DESTINATION, not by the receiver's home
 * location.
 *
 * ADR-67 lands `ingredient` deliveries at the Store and `goods`
 * deliveries at the Restaurant (goods may not sit at the Store), so the
 * Store Manager — assigned to the Store — is responsible for deliveries
 * at TWO locations. The Canteen is the attendant's. Scoping either role
 * to its single assigned location made a Restaurant- or Canteen-destined
 * purchase a dead end: no staff role could see it, and none could
 * receive it.
 *
 * | Role                | May see / receive deliveries destined for |
 * |---------------------|-------------------------------------------|
 * | `admin`             | every location (no filter — the caller uses
 * |                     | the unfiltered `listOutstandingPurchases`) |
 * | `store_manager`     | Store + Restaurant                         |
 * | `canteen_attendant` | Canteen                                    |
 *
 * Every other role receives nothing.
 *
 * This is the single source of truth for the map — the `/outstanding`
 * read and the receipt-batch write guard both resolve through it, so a
 * role can never see a delivery it may not receive, or vice versa.
 * Resolution is by `Location.type` (active rows only), never by name.
 */
const DESTINATION_TYPES: Partial<Record<Role, readonly LocationType[]>> = {
  store_manager: ["store", "restaurant"],
  canteen_attendant: ["canteen"],
};

export async function resolveReceivingDestinationIds(
  role: Role,
): Promise<string[]> {
  const types = DESTINATION_TYPES[role];
  if (!types) return [];
  const rows = await prisma.location.findMany({
    where: { type: { in: [...types] }, active: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
