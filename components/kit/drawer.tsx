// Verbatim REST transcription of Paper artboard "Component Kit — Drawers & Dialogs"
// (6OE-0): "Edit Drawer" (6Q6-0). Panel regions (header / body / footer) and the
// two header variants (single-line h-52 / title + context-subtitle) are unchanged.
// The `variant="panel" | "rail"` shapes (ADR-37b) are unchanged.
//
// Session 10 (Deliverable 3c) — the reported "transparent modal" bug + the missing
// overlay mechanics, all fixed via components/kit/internal/overlay.ts:
//   - renders its OWN .kit-scrim (blurred, --opacity-scrim, --z-overlay); panel
//     above at --z-drawer. Panel background → OPAQUE --surface-raised (D2/ADR-41),
//     NOT --surface-panel-tint. + --shadow-drawer.
//   - portal to document.body so inert / z-index / scroll-lock are reliable.
//   - on open: focus moves into the panel (first focusable, else the panel);
//     focus is TRAPPED (recomputed every Tab — handles no-focusable and
//     dynamically-added nodes); background is `inert`; <html> overflow:hidden,
//     restored exactly on close.
//   - on close (Esc / scrim click / ×): focus returns to the opener.
//   - two drawers are never both interactive (module-level active-overlay guard).
//   - slide-in via transform + --dur-base + --ease-decelerate; slide-out
//     --ease-accelerate (.kit-drawer-panel in globals.css). No layout transition.
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  useActiveOverlay,
  useBackgroundInert,
  useEscToClose,
  useFocusTrap,
  useOverlayTransition,
  useScrollLock,
} from "./internal/overlay";

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
  const isRail = variant === "rail";
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const subtitleId = React.useId();

  const { mounted, phase, endExit } = useOverlayTransition(open);
  const active = mounted && phase !== "closing";

  useActiveOverlay(active);
  useScrollLock(mounted);
  useBackgroundInert(rootRef, active);
  useFocusTrap(panelRef, active);
  useEscToClose(active, onClose);

  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setHost(document.body), []);

  if (!mounted || !host) return null;

  return createPortal(
    <div ref={rootRef} className="[font-synthesis:none] antialiased">
      <div
        className="kit-scrim"
        data-state={phase}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "kit-drawer-panel fixed flex flex-col bg-(--surface-raised) [box-shadow:var(--shadow-drawer)] outline-none",
          isRail
            ? "top-0 right-0 w-[420px] h-full border-l border-l-solid [border-left-color:var(--border-subtle)]"
            : "top-1/2 right-(--sp-7) w-[380px] h-[560px] rounded-md border border-solid [border-color:var(--border-subtle)]",
          className,
        )}
        style={!isRail ? { ["--kit-panel-y" as string]: "-50%" } : undefined}
        data-state={phase}
        data-side="right"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        ref={panelRef}
        onTransitionEnd={(e) => {
          if (e.target === panelRef.current && phase === "closing") endExit();
        }}
      >
        {/* Drawer Header */}
        {subtitle ? (
          <div className="flex items-start justify-between py-(--sp-6) shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <div className="flex flex-col gap-[2px]">
              <div
                id={titleId}
                className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1"
              >
                {title}
              </div>
              <div
                id={subtitleId}
                className="font-ui [color:var(--text-secondary)] text-caption/micro"
              >
                {subtitle}
              </div>
            </div>
            <CloseButton onClose={onClose} />
          </div>
        ) : (
          <div className="flex items-center justify-between h-[52px] shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <div
              id={titleId}
              className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1"
            >
              {title}
            </div>
            <CloseButton onClose={onClose} />
          </div>
        )}

        {/* Drawer Body */}
        <div
          className={cn(
            "flex flex-col grow",
            isRail
              ? "py-(--sp-6) px-(--sp-8) gap-(--sp-5) overflow-y-auto"
              : "p-(--sp-8) gap-(--sp-6) overflow-y-auto",
          )}
        >
          {children}
        </div>

        {/* Drawer Footer */}
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
    </div>,
    host,
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="shrink-0 kit-interactive kit-focus-ring rounded-sm [--kit-hover-bg:var(--surface-hover)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
        <line x1="18" y1="6" x2="6" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
