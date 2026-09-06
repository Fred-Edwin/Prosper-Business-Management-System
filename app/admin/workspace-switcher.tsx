"use client";

// Admin "Switch workspace" control — the frontend half of role-switching
// (docs/sprints/role-switching-session-2-handoff.md). Composed from the
// frozen kit: <Drawer variant="rail"> (sibling: app/admin/staff/
// change-pin-drawer.tsx) + <Select> for the >1-location picker + <Button>.
//
// Paper: file 01M0EZ7TAHZM26KBMWNYT0928X, page "M7 — Admin role switching",
// artboard "1 — Workspace switcher (desktop)". The design drew the role list
// as a popover above the sidebar footer; the kit has no popover primitive,
// so this uses the sanctioned <Drawer> rail (same as change-pin-drawer) with
// the artboard's row content — role name + "what you can do · location" hint,
// a check on the current workspace, and the "Recorded as Admin" note.
//
// Only rendered for a REAL Admin (the shell gates on session.user.role), so
// the "Admin (current)" row and the staff rows are always the full set.

import * as React from "react";
import { Button } from "@/components/kit/button";
import { Drawer } from "@/components/kit/drawer";
import { Select } from "@/components/kit/select";
import { useActingAs, type StaffRole } from "./use-acting-as";

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "That location isn't set up for this role yet.",
  FORBIDDEN: "Only an administrator can switch workspaces.",
  UNAUTHENTICATED: "Sign in to continue.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

type RoleRow = {
  role: StaffRole;
  label: string;
  hint: string;
};

// Verbatim from the artboard's popover rows.
const STAFF_ROWS: RoleRow[] = [
  {
    role: "store_manager",
    label: "Store Manager",
    hint: "Receiving, issues, transfers · Store",
  },
  {
    role: "cashier",
    label: "Cashier",
    hint: "Orders, handover · Restaurant",
  },
  {
    role: "canteen_attendant",
    label: "Canteen Attendant",
    hint: "Stock, handover · Canteen",
  },
];

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 12.5L9.5 18L20 6"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkspaceRow({
  label,
  hint,
  current,
  disabled,
  onSelect,
}: {
  label: string;
  hint: string;
  current: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={current ? "true" : undefined}
      disabled={disabled || current}
      onClick={onSelect}
      className="flex items-center w-full gap-(--sp-4) py-(--sp-4) px-(--sp-5) rounded-sm text-left kit-interactive kit-focus-ring [--kit-hover-bg:var(--surface-hover)] data-[current=true]:bg-(--surface-selected) disabled:opacity-100"
      data-current={current ? "true" : undefined}
    >
      <span className="flex flex-col grow gap-px">
        <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
          {label}
        </span>
        <span className="font-ui [color:var(--text-tertiary)] text-micro/micro">
          {hint}
        </span>
      </span>
      {current && <CheckIcon />}
    </button>
  );
}

export function WorkspaceSwitcher({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { actingAs, pending, error, pendingLocations, cancelPending, switchTo, exit } =
    useActingAs();

  const [pickedLocation, setPickedLocation] = React.useState<string>("");

  // Reset the transient picker state whenever the drawer is (re)opened or the
  // pending-locations prompt clears.
  React.useEffect(() => {
    if (!open || !pendingLocations) setPickedLocation("");
  }, [open, pendingLocations]);

  async function choose(role: StaffRole) {
    try {
      await switchTo(role);
      // On a single-location role the switch commits and navigates away; on a
      // multi-location role `pendingLocations` is now set and the picker shows.
    } catch {
      /* error surfaced via `error` */
    }
  }

  async function confirmLocation() {
    if (!pendingLocations || !pickedLocation) return;
    try {
      await switchTo(pendingLocations.role, pickedLocation);
    } catch {
      /* surfaced via `error` */
    }
  }

  async function handleExit() {
    try {
      await exit();
    } catch {
      /* surfaced via `error` */
    }
  }

  const errorText = error ? CODE_MESSAGE[error.code] ?? error.message : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Switch workspace"
      subtitle="Work under a staff role without signing out"
      variant="rail"
      footer={
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Close
        </Button>
      }
    >
      {errorText && (
        <div role="alert" className="font-ui text-danger text-body/sm">
          {errorText}
        </div>
      )}

      {pendingLocations ? (
        <div className="flex flex-col gap-(--sp-5)">
          <p className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {STAFF_ROWS.find((r) => r.role === pendingLocations.role)?.label} has
            more than one location. Choose which one to work at.
          </p>
          <Select
            label="Location"
            options={pendingLocations.locations.map((l) => ({
              value: l.id,
              label: l.name,
            }))}
            value={pickedLocation}
            onChange={setPickedLocation}
            placeholder="Select a location"
          />
          <div className="flex items-center gap-(--sp-4)">
            <Button
              variant="primary"
              className="grow"
              onClick={confirmLocation}
              disabled={!pickedLocation}
              loading={pending}
            >
              Enter workspace
            </Button>
            <Button
              variant="secondary"
              onClick={cancelPending}
              disabled={pending}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-(--sp-2)">
          <WorkspaceRow
            label="Admin"
            hint="Full oversight · all locations"
            current={actingAs === null}
            disabled={pending}
            onSelect={handleExit}
          />
          <div className="h-px my-(--sp-2) bg-(--border-subtle)" />
          {STAFF_ROWS.map((r) => (
            <WorkspaceRow
              key={r.role}
              label={r.label}
              hint={r.hint}
              current={actingAs === r.role}
              disabled={pending}
              onSelect={() => choose(r.role)}
            />
          ))}
          <div className="h-px my-(--sp-2) bg-(--border-subtle)" />
          <p className="font-ui [color:var(--text-tertiary)] text-micro/micro px-(--sp-5)">
            Everything you record stays attributed to Admin. Switching only
            changes which screens and location you&rsquo;re working in.
          </p>
        </div>
      )}
    </Drawer>
  );
}
