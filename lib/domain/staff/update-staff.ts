import type { Prisma } from "@prisma/client";
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
import type { StaffActor, StaffView, UpdateStaffInput } from "./types";

/**
 * Edit a staff member in place (M4). **Admin-only.** A staff record is not
 * a ledger, so this is a true edit, not a correction row (CONVENTIONS §4).
 *
 * Everything is done in one transaction so the `Staff` row and its linked
 * `User` never drift:
 *
 *   - `name`       → updated on BOTH rows (`User.name` is the login handle
 *     and is `@unique`, so a clash with another login is `CONFLICT`). A
 *     roster-only staff member has no `User`, so only `Staff.name` moves.
 *   - `role`       → updated on BOTH rows (the session's role comes from
 *     `User.role`). **Rejected for a roster-only staff member** — there is
 *     no login to carry a role; granting app access is deactivate +
 *     re-create.
 *   - `jobTitle`   → `Staff` only, roster-only staff. Rejected for a
 *     staff member who has app access (`role` is the label there).
 *   - `locationId` → THE field that drives role-scoping. Reassigning it
 *     moves which orders / handovers / stock the staff member sees. The
 *     target location must exist and be active.
 *   - `dailyRate`  → `Staff` only.
 *   - `pin`        → re-hashes `User.pinHash` (10 rounds). Never surfaced.
 *     **Rejected for a roster-only staff member** (no login).
 *
 * `NOT_FOUND` if the staff id is unknown.
 */
export async function updateStaff(
  id: string,
  input: UpdateStaffInput,
  actor: StaffActor,
): Promise<StaffView> {
  if (actor.role !== "admin") {
    throw new DomainError("FORBIDDEN", "Only an administrator can edit staff.");
  }

  const staffData: Prisma.StaffUpdateInput = {};
  const userData: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) {
    const name = normaliseName(input.name);
    staffData.name = name;
    userData.name = name;
  }
  if (input.role !== undefined) {
    assertStaffRole(input.role);
    staffData.role = input.role;
    userData.role = input.role;
  }
  if (input.jobTitle !== undefined) {
    staffData.jobTitle = normaliseJobTitle(input.jobTitle);
  }
  if (input.payModel !== undefined) {
    if (
      input.payModel !== "fixed_daily_rate" &&
      input.payModel !== "daily_entry"
    ) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Pay model must be fixed_daily_rate or daily_entry.",
        "payModel",
      );
    }
    staffData.payModel = input.payModel;
  }
  if (input.dailyRate !== undefined) {
    staffData.dailyRate = parseDailyRate(input.dailyRate);
  }
  if (input.pin !== undefined) {
    userData.pinHash = await hashPin(input.pin);
  }

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.staff.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!existing) {
      throw new DomainError("NOT_FOUND", "Staff member not found.");
    }

    // Roster-only staff have no login: role / pin are meaningless and
    // jobTitle is theirs alone; the inverse for a staff member with a
    // login. Reject the mismatch rather than silently dropping the field.
    if (existing.user) {
      if (input.jobTitle !== undefined) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "This staff member signs into the app — set a role, not a job title.",
          "jobTitle",
        );
      }
    } else {
      if (input.role !== undefined) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "This staff member has no app login. Granting app access is a deactivate-and-re-add.",
          "role",
        );
      }
      if (input.pin !== undefined) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "This staff member has no app login, so there is no PIN to reset.",
          "pin",
        );
      }
    }

    if (input.locationId !== undefined && input.locationId !== existing.locationId) {
      const location = await tx.location.findUnique({
        where: { id: input.locationId },
        select: { active: true },
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
      staffData.location = { connect: { id: input.locationId } };
    }

    if (userData.name !== undefined) {
      const clash = await tx.user.findFirst({
        where: { name: userData.name as string, id: { not: existing.user?.id } },
        select: { id: true },
      });
      if (clash) {
        throw new DomainError(
          "CONFLICT",
          "A login with that name already exists.",
          "name",
        );
      }
    }

    if (Object.keys(staffData).length > 0) {
      await tx.staff.update({ where: { id }, data: staffData });
    }
    if (Object.keys(userData).length > 0 && existing.user) {
      await tx.user.update({ where: { id: existing.user.id }, data: userData });
    }

    await tx.auditLog.create({
      data: {
        userId: actor.actorId,
        action: "correct",
        entityType: "staff",
        entityId: id,
        newValue: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.jobTitle !== undefined
            ? { jobTitle: input.jobTitle.trim() }
            : {}),
          ...(input.payModel !== undefined
            ? { payModel: input.payModel }
            : {}),
          ...(input.locationId !== undefined
            ? { locationId: input.locationId }
            : {}),
          ...(input.dailyRate !== undefined
            ? { dailyRate: parseDailyRate(input.dailyRate).toFixed(2) }
            : {}),
          ...(input.pin !== undefined ? { pinReset: true } : {}),
        },
        occurredAt: new Date(),
      },
    });

    return tx.staff.findUniqueOrThrow({ where: { id }, include: staffInclude });
  });

  return toStaffView(row);
}
