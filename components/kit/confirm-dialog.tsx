// A lightweight yes/no confirmation dialog — the on-brand counterpart to
// `window.confirm` for a reversible, non-catastrophic action (e.g.
// "Archive this customer?"). Built on the same shared overlay machinery as
// `FrictionDeleteDialog` (portal, focus-trap, scroll-lock, background-inert,
// single-overlay guard, Esc-to-close) but without its retype-to-confirm
// gate or "permanent irreversible action" danger framing — those are
// specific to a true hard-delete. Client feedback, 2026-09-17: a native
// `window.confirm()` used for the Customers archive action looked
// out-of-place against the rest of the kit.
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import {
  useActiveOverlay,
  useBackgroundInert,
  useEscToClose,
  useFocusTrap,
  useOverlayTransition,
  useScrollLock,
} from "./internal/overlay";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Body copy — plain, no danger styling. */
  bodyCopy: string;
  cancelLabel?: string;
  confirmLabel?: string;
  /** Confirm in flight — confirm button shows a spinner, everything locks. */
  submitting?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  bodyCopy,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  submitting = false,
}: ConfirmDialogProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const bodyId = React.useId();

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
      <div className="kit-scrim" data-state={phase} onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className="kit-dialog-panel fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[400px] max-w-[calc(100vw-var(--sp-8))] rounded-md bg-(--surface-raised) border border-solid [border-color:var(--border-subtle)] [box-shadow:var(--shadow-dialog)] [z-index:var(--z-dialog)] outline-none"
        data-state={phase}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onTransitionEnd={(e) => {
          if (e.target === panelRef.current && phase === "closing") endExit();
        }}
      >
        <div className="flex flex-col p-(--sp-8) gap-(--sp-5)">
          <div
            id={titleId}
            className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1"
          >
            {title}
          </div>
          <div id={bodyId} className="font-ui [color:var(--text-secondary)] text-sm/sm">
            {bodyCopy}
          </div>
        </div>

        <div className="flex items-center justify-end p-(--sp-8) pt-0 gap-(--sp-4)">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={submitting}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    host,
  );
}
