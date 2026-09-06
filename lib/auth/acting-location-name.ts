import type { Session } from "next-auth";
import { prisma } from "@/lib/db";

/**
 * The display name of the location an Admin is currently acting at, for the
 * acting-as banner's first server paint (docs/sprints/
 * role-switching-session-2-handoff.md). `null` when nobody is acting-as, or
 * the id no longer resolves — the client hook re-resolves it on a switch.
 */
export async function actingLocationName(
  session: Session,
): Promise<string | null> {
  const id = session.user.actingLocationId;
  if (!session.user.actingAs || !id) return null;
  const location = await prisma.location.findUnique({
    where: { id },
    select: { name: true },
  });
  return location?.name ?? null;
}
