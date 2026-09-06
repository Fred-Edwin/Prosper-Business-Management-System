"use client";

// Admin "Switch workspace" popover — the frontend half of role-switching
// (docs/sprints/role-switching-session-2-handoff.md).
//
// Verbatim from Paper file 01M0EZ7TAHZM26KBMWNYT0928X, page "M7 — Admin role
// switching", artboard "1 — Workspace switcher (desktop)", node "Workspace
// popover" (TQF-0): a w-[240px] panel that grows UP out of the sidebar
// footer account row — flush left, bg --nav-bg, border-t --nav-border,
// box-shadow "#00000033 0 -8px 24px". Rows:
//   - Admin (current): py-[10px] px-[14px] gap-[10px] bg --nav-bg-active,
//     label text-body/600 --nav-text-active + "Full oversight · all
//     locations" text-micro/14px --nav-text-subtle, trailing 15px check
//     (path "M4 12.5L9.5 18L20 6", stroke --nav-text-active, sw 2)
//   - divider: h-px mx-[14px] --nav-border
//   - 3 staff rows: py-[8px] px-[14px], label text-body --nav-text +
//     "<what> · <location>" text-micro/14px --nav-text-label
//   - divider
//   - note: pt-[9px] pb-[11px] px-[14px], text-micro/15px --nav-text-label,
//     "Recorded as Admin, acting as the selected role."
//
// NOT a kit component and NOT the kit <Drawer> — the kit has no popover, and
// this is a sidebar-anchored one styled entirely in --nav-* tokens. It ships
// its own scrim + Esc-to-close + focus move (small and local — the kit
// overlay internals are Drawer/Dialog-shaped and don't fit an anchored
// popover). Only rendered for a REAL Admin (the shell gates on
// session.user.role).
//
// Location model: the owner confirmed one active location per staff role, so
// there is no picker step — the hook resolves the role's single location.

import * as React from "react";
import { createPortal } from "react-dom";
import { useActingAs, type StaffRole } from "./use-acting-as";

type RoleRow = { role: StaffRole; label: string; hint: string };

// Verbatim from the artboard's rows.
const STAFF_ROWS: RoleRow[] = [
  { role: "store_manager", label: "Store Manager", hint: "Receiving, issues, transfers · Store" },
  { role: "cashier", label: "Cashier", hint: "Orders, handover · Restaurant" },
  { role: "canteen_attendant", label: "Canteen Attendant", hint: "Stock, handover · Canteen" },
];

const CODE_MESSAGE: Record<string, string> = {
  VALIDATION_ERROR: "That role has no active location set up yet.",
  FORBIDDEN: "Only an administrator can switch workspaces.",
  UNAUTHENTICATED: "Sign in to continue.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
};

const CheckIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <path
      d="M4 12.5L9.5 18L20 6"
      fill="none"
      stroke="var(--nav-text-active)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Divider() {
  return <div className="h-px mx-[14px] shrink-0 bg-(--nav-border)" />;
}

/**
 * One row. The current workspace gets the `--nav-bg-active` highlight + a
 * trailing check and is not itself a control (component-states.md — a
 * "current" row is display).
 */
function Row({
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
  const body = (
    <>
      <span className="flex flex-col grow gap-px">
        <span
          className={
            "font-ui text-body/sm " +
            (current
              ? "font-(--weight-semibold) text-(--nav-text-active)"
              : "font-(--weight-regular) text-(--nav-text)")
          }
        >
          {label}
        </span>
        <span
          className={
            "font-ui text-micro leading-[14px] " +
            (current ? "text-(--nav-text-subtle)" : "text-(--nav-text-label)")
          }
        >
          {hint}
        </span>
      </span>
      {current && CheckIcon}
    </>
  );

  if (current) {
    return (
      <div
        aria-current="true"
        className="flex items-center py-[10px] px-[14px] gap-[10px] bg-(--nav-bg-active)"
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="flex items-center w-full py-[8px] px-[14px] gap-[10px] text-left kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)] disabled:opacity-[0.55]"
    >
      {body}
    </button>
  );
}

export interface WorkspaceSwitcherProps {
  open: boolean;
  onClose: () => void;
  /**
   * DOMRect of the sidebar footer trigger. The popover anchors its BOTTOM
   * edge to the trigger's TOP edge (grows upward, flush to the trigger's
   * left) — matching artboard TQF-0. Ignored when `placement="inline"`.
   */
  anchorRect?: DOMRect | null;
  /** `"anchored"` (default) portals + positions against `anchorRect`;
   * `"inline"` returns the bare panel for a caller that places it (the
   * mobile acting-as drawer). */
  placement?: "anchored" | "inline";
}

export function WorkspaceSwitcher({
  open,
  onClose,
  anchorRect,
  placement = "anchored",
}: WorkspaceSwitcherProps) {
  const { actingAs, pending, error, switchTo, exit } = useActingAs();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [host, setHost] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => setHost(document.body), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const errorText = error ? (CODE_MESSAGE[error.code] ?? error.message) : null;

  const panel = (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Switch workspace"
      tabIndex={-1}
      className="[font-synthesis:none] w-[240px] flex flex-col bg-(--nav-bg) border-t border-t-solid border-t-(--nav-border) [box-shadow:#00000033_0px_-8px_24px] outline-none antialiased"
    >
      <Row
        label="Admin"
        hint="Full oversight · all locations"
        current={actingAs === null}
        disabled={pending}
        onSelect={() => void exit().then(onClose).catch(() => {})}
      />
      <Divider />
      {STAFF_ROWS.map((r) => (
        <Row
          key={r.role}
          label={r.label}
          hint={r.hint}
          current={actingAs === r.role}
          disabled={pending}
          onSelect={() => void switchTo(r.role).then(onClose).catch(() => {})}
        />
      ))}
      <Divider />
      {errorText ? (
        <div
          role="alert"
          className="pt-[9px] pb-[11px] px-[14px] font-ui text-micro leading-[15px] text-(--color-danger-on-dark)"
        >
          {errorText}
        </div>
      ) : (
        <div className="pt-[9px] pb-[11px] px-[14px] font-ui text-micro leading-[15px] text-(--nav-text-label)">
          Recorded as Admin, acting as the selected role.
        </div>
      )}
    </div>
  );

  if (placement === "inline") return panel;
  if (!host) return null;

  // Anchored (desktop): transparent scrim catches outside clicks; the panel's
  // BOTTOM edge sits on the trigger's TOP edge, flush to the trigger's left.
  // With no anchorRect (mobile — opened from the nav drawer) it renders as a
  // bottom sheet over a dimmed scrim instead.
  return createPortal(
    <div className="fixed inset-0 [z-index:60]">
      <div
        className={
          "absolute inset-0 " + (anchorRect ? "" : "bg-black/40")
        }
        onClick={onClose}
        aria-hidden
      />
      {anchorRect ? (
        <div
          className="absolute"
          style={{
            left: anchorRect.left,
            bottom: window.innerHeight - anchorRect.top,
          }}
        >
          {panel}
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-(--sp-6)">
          {panel}
        </div>
      )}
    </div>,
    host,
  );
}
