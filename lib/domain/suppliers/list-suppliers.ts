import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toSupplierView } from "./internal";
import type { ListSuppliersFilter, Supplier } from "./types";

/**
 * List suppliers, name-sorted. No derived balance — Supplier is a pure
 * lookup entity (see schema.prisma model comment). `search` matches name,
 * case-insensitive contains. `includeArchived` defaults to false so the
 * purchase-payment/expense dropdowns never offer an inactive vendor unless
 * the caller (the admin suppliers register, if one is added later) opts in.
 */
export async function listSuppliers(
  filter: ListSuppliersFilter,
): Promise<Supplier[]> {
  const search = filter.search?.trim();
  const where: Prisma.SupplierWhereInput = {
    ...(filter.includeArchived ? {} : { deletedAt: null }),
    ...(search && search.length > 0
      ? { name: { contains: search, mode: "insensitive" } }
      : {}),
  };

  const rows = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return rows.map(toSupplierView);
}
