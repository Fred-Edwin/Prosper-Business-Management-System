import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "./errors";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Resolve the `Staff` row (id + location) a declaring user is bound to.
 *
 * A Cashier / Canteen Attendant user links to `Staff` via `User.staffId`,
 * and `Staff.locationId` is the location they hand over for. A user with
 * no staff link is a misconfiguration → `FORBIDDEN` (mirrors
 * `resolveActorLocationId`'s contract at the domain layer).
 */
export async function resolveActingStaff(
  userId: string,
  db: Db = prisma,
): Promise<{ staffId: string; locationId: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { staff: { select: { id: true, locationId: true } } },
  });
  if (!user?.staff) {
    throw new DomainError(
      "FORBIDDEN",
      "Your account is not linked to a staff record with a location.",
    );
  }
  return { staffId: user.staff.id, locationId: user.staff.locationId };
}
