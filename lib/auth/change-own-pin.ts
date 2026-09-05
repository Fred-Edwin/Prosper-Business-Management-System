import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/domain/catalog/errors";
import { PIN_BCRYPT_ROUNDS } from "@/lib/domain/staff";

const PIN_RE = /^\d{4}$/;

/**
 * Self-service PIN change (any authenticated role, including the Admin —
 * who has no `Staff` row, so `updateStaff`'s Admin-resets-staff-PIN path
 * doesn't apply to them). Requires the caller's current PIN.
 *
 * Same bcrypt work factor and hashing path as `updateStaff`'s PIN reset
 * and the seed, so every `User.pinHash` stays comparable by the login flow.
 */
export async function changeOwnPin(
  userId: string,
  currentPin: string,
  newPin: string,
): Promise<void> {
  if (!PIN_RE.test(newPin)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "PIN must be exactly 4 digits.",
      "newPin",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  });
  if (!user) {
    throw new DomainError("NOT_FOUND", "Account not found.");
  }

  const valid = await bcrypt.compare(currentPin, user.pinHash);
  if (!valid) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Current PIN is incorrect.",
      "currentPin",
    );
  }

  if (currentPin === newPin) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "New PIN must be different from the current PIN.",
      "newPin",
    );
  }

  const pinHash = await bcrypt.hash(newPin, PIN_BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { pinHash } });
}
