import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DomainError } from "./errors";
import { STAFF_ROLES, type StaffRole, type StaffView } from "./types";

/**
 * bcrypt work factor — the same 10 rounds the seed (`prisma/seed.ts`) and
 * every existing login hash use. Do NOT change without re-hashing every
 * `User.pinHash`.
 */
export const PIN_BCRYPT_ROUNDS = 10;

const PIN_RE = /^\d{4}$/;

/** Validate + hash a 4-digit PIN exactly as the login flow expects. */
export async function hashPin(pin: string, field = "pin"): Promise<string> {
  if (!PIN_RE.test(pin)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "PIN must be exactly 4 digits.",
      field,
    );
  }
  return bcrypt.hash(pin, PIN_BCRYPT_ROUNDS);
}

export function assertStaffRole(role: string): asserts role is StaffRole {
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Role must be store_manager, cashier, or canteen_attendant.",
      "role",
    );
  }
}

export function normaliseName(name: string, field = "name"): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new DomainError("VALIDATION_ERROR", "Name is required.", field);
  }
  return trimmed;
}

const RATE_RE = /^\d+(\.\d{1,2})?$/;

/** Decimal string → `Prisma.Decimal`, must be ≥ 0. */
export function parseDailyRate(value: string, field = "dailyRate"): Prisma.Decimal {
  const trimmed = value.trim();
  if (!RATE_RE.test(trimmed)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Daily rate must be a number with up to 2 decimal places.",
      field,
    );
  }
  const dec = new Prisma.Decimal(trimmed);
  if (dec.isNegative()) {
    throw new DomainError("VALIDATION_ERROR", "Daily rate cannot be negative.", field);
  }
  return dec;
}

type StaffRow = {
  id: string;
  name: string;
  role: string;
  locationId: string;
  location: { name: string };
  dailyRate: Prisma.Decimal;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; active: boolean } | null;
};

/** Prisma staff row (with `location` + `user`) → wire shape. Never carries a PIN. */
export function toStaffView(row: StaffRow): StaffView {
  return {
    id: row.id,
    name: row.name,
    role: row.role as StaffRole,
    locationId: row.locationId,
    locationName: row.location.name,
    dailyRate: row.dailyRate.toFixed(2),
    active: row.active,
    userId: row.user?.id ?? null,
    userActive: row.user?.active ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const staffInclude = {
  location: { select: { name: true } },
  user: { select: { id: true, active: true } },
} as const;
