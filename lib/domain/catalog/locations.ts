import type { Location } from "@prisma/client";
import { prisma } from "@/lib/db";

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
