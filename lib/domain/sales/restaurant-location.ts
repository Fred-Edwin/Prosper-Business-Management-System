import type { Prisma } from "@prisma/client";
import { DomainError } from "./errors";

/**
 * The Restaurant is the only location orders are taken at (S4 handoff).
 * There is no `locationId` on the order input — the domain resolves it.
 * A single active `restaurant` `Location` is expected; if none exists the
 * business is misconfigured (`NOT_FOUND`).
 */
export async function resolveRestaurantId(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const restaurant = await tx.location.findFirst({
    where: { type: "restaurant", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!restaurant) {
    throw new DomainError(
      "NOT_FOUND",
      "No active Restaurant location is configured.",
    );
  }
  return restaurant.id;
}
