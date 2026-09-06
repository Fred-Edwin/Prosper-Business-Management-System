"use client";

// Per-feature hook for Admin role-switching ("acting as", NOT impersonation).
// See docs/sprints/role-switching-session-2-handoff.md for the backend
// contract. Mirrors the request<T> + typed-error shape of
// app/admin/staff/use-staff.ts.
//
// The flow (handoff §"Making the switch take effect"):
//   1. POST /api/auth/acting-as { role, locationId }
//   2. on 200 → useSession().update({ actingAs, locationId })  (NOT
//      actingLocationId — the jwt callback's key is `locationId`)
//   3. router.push(roleHomePath(effectiveRole)) so Server Components re-read
//
// `switchTo` handles the location picker: the route's success payload
// carries every active location of the matching type, so
//   0 → the role has no location set up (surfaced as an error, no switch)
//   1 → auto-selected, POST again with it
//   >1 → returned to the caller as `pendingLocations` for the picker; the
//        caller calls `switchTo(role, locationId)` with the chosen one.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";
import { roleHomePath, effectiveRole } from "@/lib/auth/roles";

type ApiError = { code: string; message: string; field?: string };

export class ActingAsError extends Error {
  readonly code: string;
  readonly field?: string;
  constructor(err: ApiError) {
    super(err.message);
    this.name = "ActingAsError";
    this.code = err.code;
    this.field = err.field;
  }
}

export type StaffRole = Exclude<Role, "admin">;

export type ActingAsLocation = { id: string; name: string };

type SetResponse = {
  actingAs: StaffRole;
  locationId: string;
  locationName: string;
  locations: ActingAsLocation[];
};

async function post(
  role: Role | null,
  locationId?: string,
): Promise<{ actingAs: null } | SetResponse> {
  const res = await fetch("/api/auth/acting-as", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, ...(locationId ? { locationId } : {}) }),
  });
  const json = (await res.json().catch(() => null)) as
    | { data: { actingAs: null } | SetResponse }
    | { error: ApiError }
    | null;
  if (!res.ok || !json || "error" in json) {
    throw new ActingAsError(
      json && "error" in json
        ? json.error
        : { code: "INTERNAL_ERROR", message: "Request failed." },
    );
  }
  return json.data;
}

export interface UseActingAs {
  /** The staff role the Admin is currently acting as, or `null`. */
  actingAs: StaffRole | null;
  /** Display name of the acting location (for the banner). */
  locationName: string | null;
  /** True while a switch/exit request is in flight. */
  pending: boolean;
  /** Last error, if the most recent action failed. */
  error: ActingAsError | null;
  /**
   * When a role has more than one active location, the switch pauses and
   * these are the candidates for the picker. `null` otherwise.
   */
  pendingLocations: { role: StaffRole; locations: ActingAsLocation[] } | null;
  /** Clear a `pendingLocations` picker without switching. */
  cancelPending: () => void;
  /**
   * Switch into `role`. Omit `locationId` to let the hook auto-select when
   * the role has exactly one location (and surface the picker when it has
   * more than one); pass it to commit a picked location.
   */
  switchTo: (role: StaffRole, locationId?: string) => Promise<void>;
  /** Exit acting-as mode, back to the real Admin. */
  exit: () => Promise<void>;
}

export function useActingAs(): UseActingAs {
  const router = useRouter();
  const { data: session, update } = useSession();

  const actingAs = (session?.user?.actingAs ?? null) as StaffRole | null;

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<ActingAsError | null>(null);
  const [locationName, setLocationName] = React.useState<string | null>(null);
  const [pendingLocations, setPendingLocations] = React.useState<
    { role: StaffRole; locations: ActingAsLocation[] } | null
  >(null);

  const commit = React.useCallback(
    async (actingAsValue: StaffRole | null, locId?: string) => {
      // The jwt callback re-validates this payload server-side; the route
      // response (step 1) is the authority on success/failure.
      await update({ actingAs: actingAsValue, locationId: locId });
      const target = roleHomePath(
        effectiveRole({ user: { role: "admin", actingAs: actingAsValue } }),
      );
      router.push(target);
      router.refresh();
    },
    [router, update],
  );

  const switchTo = React.useCallback(
    async (role: StaffRole, locationId?: string) => {
      setPending(true);
      setError(null);
      try {
        const data = await post(role, locationId);
        if (!("actingAs" in data) || data.actingAs === null) {
          throw new ActingAsError({
            code: "INTERNAL_ERROR",
            message: "Unexpected response.",
          });
        }
        if (!locationId && data.locations.length > 1) {
          // More than one location — hand the picker back to the caller and
          // wait for a second call with the chosen id. Nothing committed yet.
          setPendingLocations({ role, locations: data.locations });
          setPending(false);
          return;
        }
        setPendingLocations(null);
        setLocationName(data.locationName);
        await commit(data.actingAs, data.locationId);
      } catch (e) {
        setError(
          e instanceof ActingAsError
            ? e
            : new ActingAsError({
                code: "INTERNAL_ERROR",
                message: "Something went wrong.",
              }),
        );
        setPending(false);
        throw e;
      }
    },
    [commit],
  );

  const exit = React.useCallback(async () => {
    setPending(true);
    setError(null);
    setPendingLocations(null);
    try {
      await post(null);
      setLocationName(null);
      await commit(null);
    } catch (e) {
      setError(
        e instanceof ActingAsError
          ? e
          : new ActingAsError({
              code: "INTERNAL_ERROR",
              message: "Something went wrong.",
            }),
      );
      setPending(false);
      throw e;
    }
  }, [commit]);

  const cancelPending = React.useCallback(() => setPendingLocations(null), []);

  return {
    actingAs,
    locationName,
    pending,
    error,
    pendingLocations,
    cancelPending,
    switchTo,
    exit,
  };
}
