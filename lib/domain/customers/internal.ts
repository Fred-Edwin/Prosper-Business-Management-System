import { Prisma, type CustomerLocation } from "@prisma/client";
import type { Customer } from "./types";

/** Prisma customer row → wire shape. */
export function toCustomerView(row: {
  id: string;
  name: string;
  phone: string;
  location: CustomerLocation;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    location: row.location,
    archivedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** `Decimal` → 2dp decimal string. */
export function moneyString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

export const ZERO = new Prisma.Decimal(0);
