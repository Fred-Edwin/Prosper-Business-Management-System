import type { Supplier } from "./types";

/** Prisma supplier row → wire shape. */
export function toSupplierView(row: {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    note: row.note,
    archivedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
