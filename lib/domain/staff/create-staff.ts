import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import {
  assertStaffRole,
  hashPin,
  normaliseJobTitle,
  normaliseName,
  parseDailyRate,
  staffInclude,
  toStaffView,
} from "./internal";
import type { CreateStaffInput, StaffActor, StaffView } from "./types";

/**
 * Create a staff member (M4; roster-only staff added in the staff-pay
 * rework, PR 1). **Admin-only** — enforced at the route; the `actor.role`
 * check here is defence in depth.
 *
 * Two shapes, discriminated by `input.appAccess`:
 *
 *   - `appAccess: true` — a team member who signs into the app. In ONE
 *     transaction:
 *       - `Staff`: name, role, locationId (REQUIRED — drives role-scoping),
 *         dailyRate, jobTitle: null, active: true.
 *       - `User`: name (globally unique — `User.name @unique`), the
 *         bcrypt-hashed PIN (10 rounds, exactly as the seed / login flow),
 *         the same `role`, `staffId` linking back, active: true.
 *     `User.name` is unique, so a name already taken by any login is
 *     `CONFLICT` — nothing is written.
 *
 *   - `appAccess: false` — a roster-only staff member (a cook / casual the
 *     owner wants for attendance + pay but who never uses the app). Just a
 *     `Staff` row: name, jobTitle (REQUIRED), locationId, dailyRate,
 *     role: null. NO `User`, NO PIN. The name need not be globally unique
 *     (there is no login to collide with).
 *
 * Writes an `AuditLog` row either way — a staff member is not a ledger
 * entity, so its creation isn't otherwise self-evident (the
 * `createCustomer` pattern). The PIN is never put in `newValue`.
 */
export async function createStaff(
  input: CreateStaffInput,
  actor: StaffActor,
): Promise<StaffView> {
  if (actor.role !== "admin") {
    throw new DomainError("FORBIDDEN", "Only an administrator can add staff.");
  }

  const name = normaliseName(input.name);
  const dailyRate = parseDailyRate(input.dailyRate);

  const location = await prisma.location.findUnique({
    where: { id: input.locationId },
    select: { id: true, active: true },
  });
  if (!location) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "The selected location does not exist.",
      "locationId",
    );
  }
  if (!location.active) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Cannot assign staff to an inactive location.",
      "locationId",
    );
  }

  // ── Roster-only: a bare Staff row, no login ──────────────────────────
  if (input.appAccess === false) {
    const jobTitle = normaliseJobTitle(input.jobTitle);

    const row = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          name,
          role: null,
          jobTitle,
          locationId: input.locationId,
          dailyRate,
          active: true,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.actorId,
          action: "create",
          entityType: "staff",
          entityId: staff.id,
          newValue: {
            name: staff.name,
            jobTitle,
            locationId: staff.locationId,
            dailyRate: dailyRate.toFixed(2),
            appAccess: false,
          },
          occurredAt: staff.createdAt,
        },
      });
      return tx.staff.findUniqueOrThrow({
        where: { id: staff.id },
        include: staffInclude,
      });
    });

    return toStaffView(row);
  }

  // ── App access: Staff + linked login User ────────────────────────────
  assertStaffRole(input.role);
  const pinHash = await hashPin(input.pin);

  const nameClash = await prisma.user.findUnique({
    where: { name },
    select: { id: true },
  });
  if (nameClash) {
    throw new DomainError(
      "CONFLICT",
      "A login with that name already exists.",
      "name",
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.create({
      data: {
        name,
        role: input.role,
        jobTitle: null,
        locationId: input.locationId,
        dailyRate,
        active: true,
      },
    });
    await tx.user.create({
      data: {
        name,
        pinHash,
        role: input.role,
        staffId: staff.id,
        active: true,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "create",
        entityType: "staff",
        entityId: staff.id,
        newValue: {
          name: staff.name,
          role: staff.role,
          locationId: staff.locationId,
          dailyRate: dailyRate.toFixed(2),
          appAccess: true,
        },
        occurredAt: staff.createdAt,
      },
    });
    return tx.staff.findUniqueOrThrow({
      where: { id: staff.id },
      include: staffInclude,
    });
  });

  return toStaffView(row);
}
