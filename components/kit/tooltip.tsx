// NEW kit component — first tooltip in the kit (owner-approved via client
// request 2026-09-23: hover values on the 30-day dashboard bar chart).
// Built on radix-ui's Tooltip primitive (already a dependency, unused
// until now) for collision-aware positioning, focus/escape handling, and
// correct `role="tooltip"` semantics — hand-rolling that positioning math
// is exactly the kind of invisible-detail work not worth redoing. Styled
// entirely from this file: Radix ships no CSS, so nothing about the
// visual language comes from outside the kit's own tokens.
//
// Design:
//   - Inverted chip (--color-gray-900 fill, --text-inverse text) — the
//     one place in the kit that inverts, because a tooltip must read
//     against ANY background it lands on, unlike a page-surface popover
//     (select/date picker) which only ever opens against --surface-page.
//   - --shadow-md + --radius-sm, matching the select/date popover's
//     elevation tier (dropdown, not drawer/dialog) — a tooltip is the
//     lightest-weight floating surface in the kit, softer than a menu.
//   - Motion: --dur-fast scale+opacity from Radix's `data-state`, eased
//     with --ease-standard (this design system forbids bounce/overshoot —
//     tokens.css "No overshoot / spring — §1 forbids bounce"). Enters
//     from scale(0.96), never scale(0) — nothing in the kit should look
//     like it appears from nothing.
//   - transform-origin follows Radix's `data-side` so the chip scales
//     from the edge nearest its trigger, not its own center.
//   - `skipDelayDuration` on the shared provider: after the first tooltip
//     in a group opens, hovering a sibling opens instantly with no delay
//     — reading a *row* of bar values shouldn't re-pay the hover delay on
//     every bar.
//
// Hover/focus-triggered only — no `open` prop to force one always-visible.
// An always-open Radix tooltip double-renders under React StrictMode's
// dev double-invoke (two live portal instances, one visibly mispositioned)
// and a chart with several bars pinned open at once reads as cluttered
// anyway; hover already answers "what's this bar's value" on demand.
"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Wrap a chart / screen ONCE with `<TooltipGroup>` — every `<Tooltip>`
 * inside shares its provider, which is what makes "skip the hover delay
 * once a sibling is already open" work (Radix's `skipDelayDuration`).
 * `<Tooltip>` has no provider of its own; it always needs an ancestor
 * `<TooltipGroup>`, the same way kit toasts always need an ancestor
 * `<ToastProvider>`.
 */
export function TooltipGroup({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={500} skipDelayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export interface TooltipProps {
  /** The element the tooltip is anchored to — must forward a ref. */
  children: React.ReactElement;
  /** Tooltip body. Keep it to a line or two — this is a hint, not a panel. */
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/** Hover/focus only — always render inside an ancestor `<TooltipGroup>`. */
export function Tooltip({ children, content, side = "top" }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-(--z-dropdown) rounded-sm [background-color:var(--color-gray-900)] px-(--sp-3) py-(--sp-2) [box-shadow:var(--shadow-md)]",
            "font-ui text-caption/micro font-(--weight-medium) [color:var(--text-inverse)] whitespace-nowrap",
            "origin-(--radix-popper-transform-origin)",
            "data-[state=delayed-open]:animate-kit-tooltip-in data-[state=instant-open]:animate-kit-tooltip-in",
            "data-[state=closed]:animate-kit-tooltip-out",
          )}
        >
          {content}
          <TooltipPrimitive.Arrow
            width={8}
            height={4}
            className="fill-(--color-gray-900)"
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
