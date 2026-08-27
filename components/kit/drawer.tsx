// Verbatim transcription of Paper artboard "Component Kit — Drawers & Dialogs" (6OE-0):
// "Edit Drawer" (6Q6-0). Panel = w-[380px] rounded-md bg-(--surface-panel-tint) border
// border-solid [border-color:var(--border-subtle)]. Three regions from get_jsx:
//   header : h-[52px] px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)],
//            a font-(--weight-semibold) text-h1/h1 title on the left + a 16×16 close (×) svg.
//   body   : flex flex-col grow p-(--sp-8) gap-(--sp-6)  (children = kit form fields)
//   footer : flex items-center justify-end p-(--sp-8) gap-(--sp-4) border-t border-t-solid
//            [border-top-color:var(--border-subtle)]  (Cancel secondary + primary action)
//
// Session 2 §8 — TWO legitimate header variants:
//   * single-line, fixed h-[52px]  (this artboard; Product / Asset drawers)
//   * title + a --text-caption / --text-secondary context subtitle, sized by
//     padding-block: --sp-6 instead of a fixed height  (the ledger-correction drawer,
//     "Store · Beef Fillet · Aug 24"). Passing `subtitle` switches to that variant.
//
// footer primary-disabled = the Buttons artboard disabled state (§9); pass a disabled
// <Button> as `footer`. scrolled header hairline / submitting are §9 globals.
// Minimal real behaviour per §B1: open/close, Esc-to-close, click-on-veil closes,
// simple focus trap. NO data.
//
// VARIANT (added Session 4b, owner-authorised — see DECISIONS.md ADR-37b). Two shapes:
//   * `variant="panel"` (default) — the 6OE-0 floating card: w-[380px] rounded-md
//     bg-(--surface-panel-tint), padding-block header. Used by Product / Asset drawers.
//   * `variant="rail"` — a DOCKED right-edge rail: w-[420px] h-full, border-l (no radius),
//     bg-(--surface-panel-tint), a --surface-subtle footer. Used by the Admin Stock
//     ledger-correction drawer (7LJ-0) and the Financials payment drawer (85W-0), both of
//     which Paper draws as attached rails, not floating modals. The Paper kit artboard
//     6OE-0 is currently stale w.r.t. this variant — a follow-up Design Sprint adds the
//     rail state to 6OE-0 and this comment is removed.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** When set, the header switches to the title + context-subtitle variant. */
  subtitle?: string;
  /**
   * `"panel"` (default) — the 6OE-0 floating card (w-[380px] rounded-md, h-[560px]).
   * `"rail"` — a docked right-edge rail (w-[420px] h-full, border-l, no radius,
   * --surface-subtle footer). See ADR-37b.
   */
  variant?: "panel" | "rail";
  children: React.ReactNode;
  /** Footer content — typically <Button variant="secondary">Cancel</Button> + a primary. */
  footer?: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  variant = "panel",
  children,
  footer,
  className,
}: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isRail = variant === "rail";

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        "[font-synthesis:none] flex flex-col shrink-0 bg-(--surface-panel-tint) antialiased",
        isRail
          ? "w-[420px] h-full border-l border-l-solid [border-left-color:var(--border-subtle)]"
          : "w-[380px] h-[560px] rounded-md border border-solid [border-color:var(--border-subtle)]",
        className,
      )}
    >
      {/* Drawer Header */}
      {subtitle ? (
        <div className="flex items-start justify-between py-(--sp-6) shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
              {title}
            </div>
            <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
              {subtitle}
            </div>
          </div>
          <CloseButton onClose={onClose} />
        </div>
      ) : (
        <div className="flex items-center justify-between h-[52px] shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            {title}
          </div>
          <CloseButton onClose={onClose} />
        </div>
      )}

      {/* Drawer Body — rail uses tighter gap + overflow-clip, matching 7LJ-0 / 85W-0 */}
      <div
        className={cn(
          "flex flex-col grow",
          isRail
            ? "py-(--sp-6) px-(--sp-8) gap-(--sp-5) overflow-clip"
            : "p-(--sp-8) gap-(--sp-6) overflow-y-auto",
        )}
      >
        {children}
      </div>

      {/* Drawer Footer — panel: right-aligned, subtle top border. rail: --surface-subtle
          fill, actions left-aligned (a full-width primary via <Button className="grow">). */}
      {footer && (
        <div
          className={cn(
            "flex items-center shrink-0 gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]",
            isRail
              ? "py-(--sp-6) px-(--sp-8) [background-color:var(--surface-subtle)]"
              : "justify-end p-(--sp-8)",
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="shrink-0 kit-interactive kit-focus-ring"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <line x1="18" y1="6" x2="6" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
