import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      active: boolean;
      /**
       * Admin role-switching ("acting as", NOT impersonation). When the
       * real Admin is working under a staff role's screens/scoping, this
       * holds that role; `null` otherwise (and always `null` for a real
       * staff user). The real identity (`id`, `role`) never changes — see
       * `effectiveRole` in `lib/auth/roles.ts` and
       * `docs/sprints/role-switching-session-1-handoff.md`.
       */
      actingAs: Role | null;
      /**
       * The `Location.id` the Admin is scoped to while `actingAs` is one
       * of the three location-bound staff roles. Set and cleared together
       * with `actingAs`; `null` whenever `actingAs` is `null` or `admin`.
       */
      actingLocationId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    actingAs?: Role | null;
    actingLocationId?: string | null;
  }
}
