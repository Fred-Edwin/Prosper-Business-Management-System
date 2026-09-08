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

/**
 * Create a staff member. Two shapes, discriminated by `appAccess`:
 *
 *   - `appAccess: true`  → a team member who signs into the app. `role`
 *     (one of `STAFF_ROLES`) and `pin` are required; `createStaff` also
 *     creates the linked login `User`.
 *   - `appAccess: false` → a roster-only staff member (a cook / casual).
 *     `jobTitle` is required; there is NO `role`, NO `pin`, NO `User`.
 *     They still get a location, attendance, and pay.
 */
export type CreateStaffInput =
  | {
      appAccess: true;
      name: string;
      role: StaffRole;
      locationId: string;
      /** Decimal string, e.g. "550.00"; must be ≥ 0. */
      dailyRate: string;
      /** Exactly 4 digits. Set by the Admin. */
      pin: string;
    }
  | {
      appAccess: false;
      name: string;
      /** Free-text job description, e.g. "Cook". Required, non-empty. */
      jobTitle: string;
      locationId: string;
      /** Decimal string, e.g. "550.00"; must be ≥ 0. */
      dailyRate: string;
    };

export type UpdateStaffInput = {
  name?: string;
  /**
   * Only meaningful for a staff member who HAS app access (a linked
   * `User`). Ignored for a roster-only staff member — `updateStaff`
   * cannot grant or revoke app access; that's deactivate + re-create.
   */
  role?: StaffRole;
  /** Roster-only staff: rename the job title. Non-empty when present. */
  jobTitle?: string;
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
  /**
   * The app role, or `null` for a roster-only staff member. A UI caption
   * shows `role` when set, otherwise `jobTitle`.
   */
  role: StaffRole | null;
  /** Free-text job label for a roster-only staff member; `null` otherwise. */
  jobTitle: string | null;
  /** `true` when this staff member has a login `User` (i.e. `role` is set). */
  appAccess: boolean;
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
