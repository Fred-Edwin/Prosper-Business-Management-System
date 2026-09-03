import { prisma } from "@/lib/db";
import { staffInclude, toStaffView } from "./internal";
import type { StaffView } from "./types";

export type ListStaffFilter = {
  /** Case-insensitive contains on name. */
  search?: string;
  /** Default: all. `true` → active only; `false` → inactive only. */
  active?: boolean;
  /** Restrict to one location. */
  locationId?: string;
};

/**
 * List staff (M4). **Admin-only** — enforced at the route. Never returns a
 * PIN or hash (`toStaffView` carries neither; the query never selects
 * `user.pinHash`).
 */
export async function listStaff(
  filter: ListStaffFilter = {},
): Promise<StaffView[]> {
  const search = filter.search?.trim();
  const rows = await prisma.staff.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
    },
    include: staffInclude,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(toStaffView);
}

/** Fetch one staff member. **Admin-only.** Never returns a PIN or hash. */
export async function getStaff(id: string): Promise<StaffView | null> {
  const row = await prisma.staff.findUnique({
    where: { id },
    include: staffInclude,
  });
  return row ? toStaffView(row) : null;
}
