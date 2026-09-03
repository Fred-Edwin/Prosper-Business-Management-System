import type { Role } from "@prisma/client";

export type { Role } from "@prisma/client";

/**
 * Staff & Pay domain shapes (M4, PRD §4.8).
 *
 * A `Staff` row and its 1:1 login `User` are created and updated together
 * — the owner's decision (M4 S8A): there is no self-service first-login.
 * The Admin sets the 4-digit PIN; it is bcrypt-hashed into `User.pinHash`
 * exactly as the seed / login flow do, and **never** returned or logged in
 * any read.
 *
 * `dailyRate` is money — `Prisma.Decimal` inside the domain, a decimal
 * string at the route boundary.
 */

/** A staff role is any `Role` except `admin` — the Admin is not staff. */
export const STAFF_ROLES = [
  "store_manager",
  "cashier",
  "canteen_attendant",
] as const satisfies readonly Role[];

export type StaffRole = (typeof STAFF_ROLES)[number];

export type CreateStaffInput = {
  name: string;
  role: StaffRole;
  locationId: string;
  /** Decimal string, e.g. "550.00"; must be ≥ 0. */
  dailyRate: string;
  /** Exactly 4 digits. Set by the Admin. */
  pin: string;
};

export type UpdateStaffInput = {
  name?: string;
  role?: StaffRole;
  /** Reassigning this re-scopes everything the staff member can see. */
  locationId?: string;
  dailyRate?: string;
  /** When present, resets the login PIN. Exactly 4 digits. */
  pin?: string;
};

/** Wire shape for a staff read — no PIN, no hash, ever. */
export type StaffView = {
  id: string;
  name: string;
  role: StaffRole;
  locationId: string;
  locationName: string;
  dailyRate: string;
  active: boolean;
  /** The linked login account's id, and whether it can currently sign in. */
  userId: string | null;
  userActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Acting-user context for staff mutations. Admin-only, enforced at the route. */
export type StaffActor = {
  actorId: string;
  role: string;
};
