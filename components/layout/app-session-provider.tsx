"use client";

// next-auth's <SessionProvider>, scoped to the role route trees that need
// client-side session access (`useSession().update(...)` for Admin
// role-switching — see docs/sprints/role-switching-session-2-handoff.md).
//
// Not mounted at the root layout on purpose: only /admin + the three staff
// trees read the session on the client. `signIn` / `signOut` from
// next-auth/react work without a provider, which is why the login form and
// the sign-out buttons never needed one.

import * as React from "react";
import { SessionProvider } from "next-auth/react";

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
