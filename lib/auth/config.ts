import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

// Lockout thresholds for the 4-digit PIN (small keyspace — brute-force
// protection is non-negotiable here, see DECISIONS.md ADR-5 addendum).
const MAX_FAILED_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  // JWT strategy, not database sessions: next-auth v4's Credentials
  // provider only supports JWT (see DECISIONS.md ADR-5 addendum). Instant
  // revocation — the reason ADR-5 originally wanted database sessions —
  // is preserved instead via the `active` re-check in the session
  // callback below, so a deactivated user is signed out on their very
  // next request.
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        name: { label: "Name", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials?.pin) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { name: credentials.name },
        });

        if (!user || !user.active) {
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.pin, user.pinHash);

        if (!valid) {
          const attempts = user.failedPinAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedPinAttempts: attempts,
              lockedUntil:
                attempts >= MAX_FAILED_PIN_ATTEMPTS
                  ? new Date(Date.now() + LOCKOUT_DURATION_MS)
                  : null,
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedPinAttempts: 0, lockedUntil: null },
        });

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // `authorize()` above always returns `{ id, name, role }` for this
        // Credentials-only provider; `User`'s type just doesn't declare
        // the custom `role` field.
        const authUser = user as typeof user & { role: Role };
        token.id = authUser.id;
        token.role = authUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Re-check `active` against the DB on every session read so
      // revoking a user takes effect on their very next request, without
      // waiting for the JWT to expire — this is what preserves ADR-5's
      // "instant revocation" goal under a JWT strategy (see addendum).
      // next-auth's `session` callback can't return null to signal "no
      // session," so `requireRole` (lib/auth/session.ts) additionally
      // checks `session.user.active` and treats false the same as no
      // session at all.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { active: true, role: true, name: true },
      });

      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = dbUser?.name ?? (token.name as string);
        session.user.role = dbUser?.role ?? (token.role as Role);
        session.user.active = dbUser?.active ?? false;
      }
      return session;
    },
  },
};
