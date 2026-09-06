"use client";

// Per-feature hook for Admin role-switching ("acting as", NOT impersonation).
// See docs/sprints/role-switching-session-2-handoff.md for the backend
// contract. Mirrors the request<T> + typed-error shape of
// app/admin/staff/use-staff.ts.
//
// The flow (handoff §"Making the switch take effect"):
//   1. resolve the role's single active location (GET /api/locations, filter
//      by the role's LocationType — one Store / Restaurant / Canteen; the
//      owner confirmed a single location per role, so no picker step)
//   2. POST /api/auth/acting-as { role, locationId }
//   3. on 200 → useSession().update({ actingAs, locationId })  (key is
//      `locationId`, NOT `actingLocationId` — the jwt callback's contract)
//   4. router.push(roleHomePath(effectiveRole)) so Server Components re-read
//
// To exit: POST { role: null } → update({ actingAs: null }) → back to /admin.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Role, LocationType } from "@prisma/client";
import { roleHomePath, effectiveRole } from "@/lib/auth/roles";

// Client-safe copy of lib/auth/acting-as.ts's ACTING_AS_LOCATION_TYPE — that
// module imports @/lib/db (Prisma + the pg driver) and must never reach the
// browser bundle. The route re-validates the type/role match server-side, so
// this is only used to pick the role's single active location for the POST.
const ACTING_AS_LOCATION_TYPE: Record<Exclude<Role, "admin">, LocationType> = {
  store_manager: "store",
  cashier: "restaurant",
  canteen_attendant: "canteen",
};

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

type SetResponse = {
  actingAs: StaffRole;
  locationId: string;
  locationName: string;
};

type LocationRow = { id: string; name: string; type: LocationType };

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: ApiError }
    | null;
  if (!res.ok || !body || "error" in body) {
    throw new ActingAsError(
      body && "error" in body
        ? body.error
        : { code: "INTERNAL_ERROR", message: "Request failed." },
    );
  }
  return body.data;
}

/** The one active location of the type this staff role works at. */
async function resolveLocationId(role: StaffRole): Promise<string> {
  const rows = await json<LocationRow[]>(await fetch("/api/locations"));
  const wanted = ACTING_AS_LOCATION_TYPE[role];
  const match = rows.filter((r) => r.type === wanted);
  if (match.length === 0) {
    throw new ActingAsError({
      code: "VALIDATION_ERROR",
      message: `No active ${wanted} is set up for this role yet.`,
      field: "locationId",
    });
  }
  // The owner confirmed one location per role; if a business ever has more,
  // the first (name-sorted by the API) is taken rather than blocking.
  return match[0].id;
}

async function postActingAs(
  role: Role | null,
  locationId?: string,
): Promise<{ actingAs: null } | SetResponse> {
  return json<{ actingAs: null } | SetResponse>(
    await fetch("/api/auth/acting-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, ...(locationId ? { locationId } : {}) }),
    }),
  );
}

export interface UseActingAs {
  /** The staff role the Admin is currently acting as, or `null`. */
  actingAs: StaffRole | null;
  /** Display name of the acting location, once a switch this session set it. */
  locationName: string | null;
  /** True while a switch/exit request is in flight. */
  pending: boolean;
  /** Last error, if the most recent action failed. */
  error: ActingAsError | null;
  /** Switch into `role` (its single location is resolved automatically). */
  switchTo: (role: StaffRole) => Promise<void>;
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

  const commit = React.useCallback(
    async (actingAsValue: StaffRole | null, locId?: string) => {
      // The jwt callback re-validates this payload server-side; the route
      // response is the authority on success/failure.
      await update({ actingAs: actingAsValue, locationId: locId });
      router.push(
        roleHomePath(
          effectiveRole({ user: { role: "admin", actingAs: actingAsValue } }),
        ),
      );
      router.refresh();
    },
    [router, update],
  );

  const run = React.useCallback(
    async (fn: () => Promise<void>) => {
      setPending(true);
      setError(null);
      try {
        await fn();
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
    [],
  );

  const switchTo = React.useCallback(
    (role: StaffRole) =>
      run(async () => {
        const locationId = await resolveLocationId(role);
        const data = await postActingAs(role, locationId);
        if (!("actingAs" in data) || data.actingAs === null) {
          throw new ActingAsError({
            code: "INTERNAL_ERROR",
            message: "Unexpected response.",
          });
        }
        setLocationName(data.locationName);
        await commit(data.actingAs, data.locationId);
      }),
    [run, commit],
  );

  const exit = React.useCallback(
    () =>
      run(async () => {
        await postActingAs(null);
        setLocationName(null);
        await commit(null);
      }),
    [run, commit],
  );

  return { actingAs, locationName, pending, error, switchTo, exit };
}
