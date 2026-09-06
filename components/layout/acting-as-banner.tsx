"use client";

// The persistent "Acting as {Role} — recorded as Admin / Exit to Admin" strip
// shown whenever an Admin is working under a staff role
// (docs/sprints/role-switching-session-2-handoff.md).
//
// Verbatim from Paper file 01M0EZ7TAHZM26KBMWNYT0928X, page "M7 — Admin role
// switching":
//   - desktop  → artboard "3 — Staff list screen on desktop" node TL7-0:
//     px-[32px] py-[9px], text-sm, "Exit to Admin"
//   - mobile   → artboard "2 — Acting-as banner (mobile)" node TE0-0:
//     px-[16px] py-[9px], text-caption, "Exit"
//   Both: shield glyph in --color-gold-brand, ground/border/text from the
//   --color-acting-as* tokens (tokens.css — a muted authoritative gold, its
//   own role, NOT --color-warning: this is "you're in someone else's seat",
//   not a warning). No raw hex (CONVENTIONS §6).
//
// Not a kit component — a layout affordance rendered as a full-width strip
// above the shell chrome (the artboard spans the whole viewport, above the
// sidebar). Renders nothing unless an Admin is acting-as (a real staff
// user's `actingAs` is always null).

import * as React from "react";
import { useActingAs } from "@/app/admin/use-acting-as";

const ROLE_LABEL: Record<string, string> = {
  store_manager: "Store Manager",
  cashier: "Cashier",
  canteen_attendant: "Canteen Attendant",
};

const ShieldIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <path
      d="M12 2L3 7v6c0 5 4 8.5 9 9 5-.5 9-4 9-9V7z"
      fill="none"
      stroke="var(--color-gold-brand)"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export function ActingAsBanner({
  locationName,
  /** `"desktop"` uses the wider padding + "Exit to Admin" label (TL7-0);
   * `"mobile"` uses the tighter padding + "Exit" (TE0-0). */
  density = "desktop",
}: {
  locationName?: string | null;
  density?: "desktop" | "mobile";
}) {
  const { actingAs, locationName: liveName, pending, exit } = useActingAs();

  if (!actingAs) return null;

  const where = liveName ?? locationName ?? null;
  const roleLabel = ROLE_LABEL[actingAs] ?? actingAs;
  const mobile = density === "mobile";

  return (
    <div
      role="region"
      aria-label="Acting as a staff role"
      className={
        "[font-synthesis:none] flex items-center shrink-0 w-full py-[9px] bg-acting-as-bg border-b border-b-solid border-acting-as-border antialiased " +
        (mobile ? "gap-[8px] px-[16px]" : "gap-[10px] px-[32px]")
      }
    >
      {ShieldIcon}
      <span
        className={
          "grow font-ui font-(--weight-semibold) text-acting-as " +
          (mobile ? "text-caption/micro" : "text-sm/micro")
        }
      >
        Acting as {roleLabel}
        {where ? ` at ${where}` : ""} — recorded as Admin
      </span>
      <button
        type="button"
        onClick={() => {
          void exit();
        }}
        disabled={pending}
        className={
          "shrink-0 font-ui font-(--weight-semibold) text-acting-as underline decoration-1 [text-underline-position:from-font] kit-interactive kit-focus-ring rounded-sm disabled:opacity-[0.6] " +
          (mobile ? "text-caption/micro" : "text-sm/micro")
        }
      >
        {mobile ? "Exit" : "Exit to Admin"}
      </button>
    </div>
  );
}
