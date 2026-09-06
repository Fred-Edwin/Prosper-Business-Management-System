"use client";

// The persistent "You're acting as {Role} at {location} — Exit to Admin"
// strip shown whenever an Admin is working under a staff role
// (docs/sprints/role-switching-session-2-handoff.md, Paper artboards 2–4).
//
// Not a kit component — it's a layout affordance, rendered above the shell
// chrome by StaffShellClient / AdminShellClient. Colour comes from the kit
// `--color-warning` amber tokens (the same family the kit <Banner warning>
// uses); no raw hex (CONVENTIONS §6). The design drew a bespoke gold; this
// ships the sanctioned warning token — see the PROGRESS Session 2 entry.
//
// Renders nothing when the Admin is not acting as anyone (and for a real
// staff user, whose `actingAs` is always null).

import * as React from "react";
import { useActingAs } from "@/app/admin/use-acting-as";

const ROLE_LABEL: Record<string, string> = {
  store_manager: "Store Manager",
  cashier: "Cashier",
  canteen_attendant: "Canteen Attendant",
};

export function ActingAsBanner({
  locationName,
}: {
  /** Server-resolved name of the acting location, for the first paint. */
  locationName?: string | null;
}) {
  const { actingAs, locationName: liveName, pending, exit } = useActingAs();

  if (!actingAs) return null;

  const where = liveName ?? locationName ?? null;
  const roleLabel = ROLE_LABEL[actingAs] ?? actingAs;

  return (
    <div
      role="region"
      aria-label="Acting as a staff role"
      className="[font-synthesis:none] flex items-center shrink-0 w-full gap-(--sp-3) py-(--sp-3) px-(--sp-6) bg-warning-bg border-b border-b-solid border-warning antialiased"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <path
          d="M12 2L3 7v6c0 5 4 8.5 9 9 5-.5 9-4 9-9V7z"
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-ui font-(--weight-semibold) text-warning text-sm/micro">
        Acting as {roleLabel}
        {where ? ` at ${where}` : ""} — recorded as Admin
      </span>
      <span className="grow" />
      <button
        type="button"
        onClick={() => {
          void exit();
        }}
        disabled={pending}
        className="font-ui font-(--weight-semibold) text-warning text-sm/micro underline kit-interactive kit-focus-ring rounded-sm disabled:opacity-[0.6]"
      >
        Exit to Admin
      </button>
    </div>
  );
}
