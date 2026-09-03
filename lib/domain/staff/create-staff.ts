import { prisma } from "@/lib/db";
import { DomainError } from "./errors";
import {
  assertStaffRole,
  hashPin,
  normaliseName,
  parseDailyRate,
  staffInclude,
  toStaffView,
} from "./internal";
import type { CreateStaffInput, StaffActor, StaffView } from "./types";

/**
 * Create a staff member AND their login account in ONE transaction
 * (owner decision, M4 S8A). **Admin-only** — enforced at the route; the
 * `actor.role` check here is defence in depth.
 *
 *   - `Staff`: name, role, locationId (REQUIRED — drives role-scoping),
 *     dailyRate, active: true.
 *   - `User`: name (must be globally unique — `User.name @unique`), the
 *     bcrypt-hashed PIN (10 rounds, exactly as the seed / login flow),
 *     the same `role`, `staffId` linking back, active: true.
 *
 * `User.name` is unique, so a name already taken by any login (staff or a
 * prior Admin account) is `CONFLICT` — nothing is written.
 *
 * Writes an `AuditLog` row — a staff member is not a ledger entity, so its
 * creation isn't otherwise self-evident (the `createCustomer` pattern).
 * The PIN is never put in `newValue`.
 */
export async function createStaff(
  input: CreateStaffInput,
  actor: StaffActor,
): Promise<StaffView> {
  if (actor.role !== "admin") {
    throw new DomainError("FORBIDDEN", "Only an administrator can add staff.");
  }

  const name = normaliseName(input.name);
  assertStaffRole(input.role);
  const dailyRate = parseDailyRate(input.dailyRate);
  const pinHash = await hashPin(input.pin);

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
